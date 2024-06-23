import { BigQuery } from "@google-cloud/bigquery";
const bigquery = new BigQuery();

export async function insert(record) {
  const datasetId = process.env.BQ_DATASET_ID || "dev";
  const tableId = process.env.BQ_TABLE_ID || "qa";
  await bigquery.dataset(datasetId).table(tableId).insert(record);
}
export function timestamp(date) {
  return bigquery.timestamp(date);
}

export default async function (environment, version, question, answer) {
  const record = {
    ts: timestamp(new Date()),
    env: environment,
    ver: version,
    q: question,
    a: answer,
  };
  await insert(record);
}
