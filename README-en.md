A chatbot sample on Google Cloud
===

## Basic configurations

### 1.1. Define an environment

Set your project as environment variables.

```bash
gcloud config set project "## Your project ID here ##"
export PROJECT_ID=$( gcloud config get-value project )
export PROJECT_NUMBER=$( gcloud projects list --filter="${GOOGLE_CLOUD_PROJECT}" --format="value(PROJECT_NUMBER)" )
```

Specify Tokyo as a region we use.

```bash
export GOOGLE_CLOUD_REGION=asia-northeast1
```

It is recommended to create resources with different environment names in this tutorial, like development and production. We will assume the development environment and prefix it with `dev`.

```bash
export ENVIRONMENT_NAME=dev
```

If multiple users are using one project, try using the verified email address as the username.

```bash
export ACCOUNT_EMAIL=$( gcloud auth list --filter 'status:ACTIVE' --format 'value(account)' )
export ENVIRONMENT_NAME="dev-$( echo ${ACCOUNT_EMAIL} | cut -d "@" -f 1 )"
```

### 1.2. Enable Google Cloud APIs

In Google Cloud, you can use resources by enabling **Service APIs** for each project. Now please enable the services you need.

```bash
gcloud services enable compute.googleapis.com run.googleapis.com bigquery.googleapis.com \
    discoveryengine.googleapis.com storage.googleapis.com artifactregistry.googleapis.com
```

## Basic services

### 2.1. Google Cloud Storage

Create a bucket to upload the files that will be used as evidence for the RAG system.

```bash
export BUCKET_NAME="${ENVIRONMENT_NAME}-rag-storage"
gcloud storage buckets create "gs://${BUCKET_NAME}" --location "${GOOGLE_CLOUD_REGION}" \
    --uniform-bucket-level-access --public-access-prevention --enable-autoclass
```

Download a suitable file as sample.pdf and upload it to your bucket.

```bash
gcloud storage cp sample.pdf gs://${BUCKET_NAME}/rag/jp/ja/car/2024/manual/sample.pdf
```

### 2.2. Vertex AI Search

1. Go to https://console.cloud.google.com/gen-app-builder/start and enable it.
2. Select "Search" under "Select app type"
3. Enter your app name, company or organization name as appropriate, and select "Global" as the app location
4. Proceed to creating a data store, select "Cloud Storage" as the data source, specify the folder to import, and click "Create".
5. Return to the app creation screen, select the data source and click "Create"

This will create a vector database and set up a search system.

### 2.3. IAM service account

Set the permissions required for your Cloud Run application.

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

First, create a Cloud Run service using the sample application.

```bash
gcloud run deploy "${ENVIRONMENT_NAME}-chatbot" --region "${GOOGLE_CLOUD_REGION}" \
    --platform "managed" --cpu 1.0 --memory 512Mi --image gcr.io/cloudrun/hello \
    --service-account "${ENVIRONMENT_NAME}-chatbot@${PROJECT_ID}.iam.gserviceaccount.com" \
    --execution-environment gen2 --no-allow-unauthenticated
```

Grant permissions to allow communication if the request is from IAP or the service account created in 2.2.

```bash
gcloud beta services identity create --service "iap.googleapis.com"
gcloud run services add-iam-policy-binding "${ENVIRONMENT_NAME}-chatbot" --region "${GOOGLE_CLOUD_REGION}" \
    --member "serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-iap.iam.gserviceaccount.com" \
    --role "roles/run.invoker"
gcloud run services add-iam-policy-binding "${ENVIRONMENT_NAME}-chatbot" --region "${GOOGLE_CLOUD_REGION}" \
    --member "serviceAccount:${ENVIRONMENT_NAME}-chatbot@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role "roles/run.invoker"
```

Let's connect to the service. The following command proxies to the service.

```bash
gcloud beta run services proxy --region "${GOOGLE_CLOUD_REGION}" "${ENVIRONMENT_NAME}-chatbot"
```

In this state, access to http://localhost:8080 will be forwarded to the service on Cloud Run.

### 2.5. BigQuery

Create a dataset,

```bash
bq --location "${GOOGLE_CLOUD_REGION}" mk --dataset "${ENVIRONMENT_NAME//-/_}"
```

And a table.

```bash
bq mk --table --description "Metrics table" \
    --schema 'ts:TIMESTAMP,env:STRING,ver:STRING,q:STRING,a:STRING' \
    --time_partitioning_field ts \
    --time_partitioning_type DAY \
    "${ENVIRONMENT_NAME//-/_}.qa"
```

## Developing GenAI applications

### 3.1. Start the API server

While checking the Vertex AI Search data store ID on the console, set the following environment variables.

```bash
export VAIS_DATASTORE_ID=
export BQ_DATASET_ID=${ENVIRONMENT_NAME//-/_}
export PORT=9000
export LOG_LEVEL=debug
```

Now let's try running the application locally.

```bash
cd src
pnpm install
npm run lint
npm start
```

Try execute the following command from another terminal.

```bash
curl -sXPOST -H 'Content-Type: application/json' -d '{"q":"Hello :)"}' http://localhost:9000/api/v1/chat
```
