Chatbot サンプル on Google Cloud
===

## 基本設定

### 1.1. 環境の設定

利用するプロジェクトを設定してください。

```bash
gcloud config set project "## あなたのプロジェクト ID ##"
export PROJECT_ID=$( gcloud config get-value project )
export PROJECT_NUMBER=$( gcloud projects list --filter="${GOOGLE_CLOUD_PROJECT}" --format="value(PROJECT_NUMBER)" )
```

リージョンには東京を指定しましょう。

```bash
export GOOGLE_CLOUD_REGION=asia-northeast1
```

開発環境や本番環境ごとに異なる名前でリソースを作ることが推奨されます。以下では開発環境を想定して `dev` という接頭辞をつけます。

```bash
export ENVIRONMENT_NAME=dev
```

もし一つのプロジェクトに複数人で利用する場合は認証したメールアドレスをユーザー名として利用してみます。

```bash
export ACCOUNT_EMAIL=$( gcloud auth list --filter 'status:ACTIVE' --format 'value(account)' )
export ENVIRONMENT_NAME="dev-$( echo ${ACCOUNT_EMAIL} | cut -d "@" -f 1 )"
```

### 1.2. API の有効化

Google Cloud では、プロジェクトごとに **サービスの API** を有効化することでリソースが利用できるようになります。今回り要するサービスを有効化します。

```bash
gcloud services enable compute.googleapis.com run.googleapis.com bigquery.googleapis.com \
    discoveryengine.googleapis.com storage.googleapis.com artifactregistry.googleapis.com
```

## 基本サービスの起動

### 2.1. Google Cloud Storage

RAG の根拠として利用するファイルをアップロードするためのバケットを作成します。

```bash
export BUCKET_NAME="${ENVIRONMENT_NAME}-rag-storage"
gcloud storage buckets create "gs://${BUCKET_NAME}" --location "${GOOGLE_CLOUD_REGION}" \
    --uniform-bucket-level-access --public-access-prevention --enable-autoclass
```

適当なファイルを sample.pdf としてダウンロードして、バケットへアップロードしてみましょう。

```bash
gcloud storage cp sample.pdf gs://${BUCKET_NAME}/rag/jp/ja/car/2024/manual/sample.pdf
```

### 2.2. Vertex AI Search

1. https://console.cloud.google.com/gen-app-builder/start にアクセスし、有効化
2. アプリの種類の選択で「検索」を選択
3. アプリ名、会社名または組織名を適宜入力し、アプリのロケーションとして「グローバル」を選択
4. データストアの作成に進み、データソースとして「Cloud Storage」を選び、インポートするフォルダを指定して「作成」
5. アプリ作成画面にもどったらデータソースを選んで「作成」

これでベクトル データベースが作られ、検索システムがセットアップされます。

### 2.3. IAM サービスアカウントの作成

Cloud Run アプリケーションに必要となる権限を設定します。

```sh
gcloud iam service-accounts create "${ENVIRONMENT_NAME}-chatbot" \
    --description "Service Account for Chatbot applications"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member "serviceAccount:${ENVIRONMENT_NAME}-chatbot@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role "roles/discoveryengine.editor"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member "serviceAccount:${ENVIRONMENT_NAME}-chatbot@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role "roles/bigquery.dataEditor"
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
    --member "serviceAccount:${ENVIRONMENT_NAME}-chatbot@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role "roles/storage.admin"
```

### 2.4. Cloud Run

いったんサンプルのアプリケーションを使い Cloud Run サービスを作成しておきます。

```bash
gcloud run deploy "${ENVIRONMENT_NAME}-chatbot" --region "${GOOGLE_CLOUD_REGION}" \
    --platform "managed" --cpu 1.0 --memory 512Mi --image gcr.io/cloudrun/hello \
    --service-account "${ENVIRONMENT_NAME}-chatbot@${PROJECT_ID}.iam.gserviceaccount.com" \
    --execution-environment gen2 --no-allow-unauthenticated
```

IAP、または 2.2. で作成したサービス アカウントからの要求なら通信を許可するよう、権限を付与します。

```bash
gcloud beta services identity create --service "iap.googleapis.com"
gcloud run services add-iam-policy-binding "${ENVIRONMENT_NAME}-chatbot" --region "${GOOGLE_CLOUD_REGION}" \
    --member "serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-iap.iam.gserviceaccount.com" \
    --role "roles/run.invoker"
gcloud run services add-iam-policy-binding "${ENVIRONMENT_NAME}-chatbot" --region "${GOOGLE_CLOUD_REGION}" \
    --member "serviceAccount:${ENVIRONMENT_NAME}-chatbot@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role "roles/run.invoker"
```

サービスに接続してみましょう。

```bash
gcloud beta run services proxy --region "${GOOGLE_CLOUD_REGION}" "${ENVIRONMENT_NAME}-chatbot"
```

この状態であれば http://localhost:8080 へのアクセスが Cloud Run 上のサービスに転送されます。

### 2.5. BigQuery

データセットを作成し、

```bash
bq --location "${GOOGLE_CLOUD_REGION}" mk --dataset "${ENVIRONMENT_NAME//-/_}"
```

テーブルを作成しましょう。

```bash
bq mk --table --description "Metrics table" \
    --schema 'ts:TIMESTAMP,env:STRING,ver:STRING,q:STRING,a:STRING' \
    --time_partitioning_field ts \
    --time_partitioning_type DAY \
    "${ENVIRONMENT_NAME//-/_}.qa"
```

## GenAI アプリケーションの開発

### 3.1. API サーバーの起動

Vertex AI Search のデータストア ID を画面で確認しながら、以下の環境変数を設定します。

```bash
export VAIS_DATASTORE_ID=
export BQ_DATASET_ID=${ENVIRONMENT_NAME//-/_}
export PORT=9000
export LOG_LEVEL=debug
```

その上で、ローカルでアプリケーションを起動してみましょう。

```bash
cd src
pnpm install
npm run lint
npm start
```

別のターミナルから以下のコマンドを実行してみます。

```bash
curl -sXPOST -H 'Content-Type: application/json' -d '{"q":"こんにちは"}' http://localhost:9000/api/v1/chat
```
