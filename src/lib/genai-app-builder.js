// @see https://cloud.google.com/nodejs/docs/reference/discoveryengine/latest
import { SearchServiceClient } from "@google-cloud/discoveryengine";

const location = process.env.VAIS_LOCATION || "global";
const apiEndpoint =
  location === 'global'
    ? 'discoveryengine.googleapis.com'
    : `${location}-discoveryengine.googleapis.com`;
const client = new SearchServiceClient({apiEndpoint: apiEndpoint});

export default async function (question) {
  const request = {
    query: question,
    pageSize: 10,
    contentSearchSpec: {
        summarySpec: {
            ignoreAdversarialQuery: true,
            includeCitations: true,
            summaryResultCount: 5,
            modelSpec: {
               version: "gemini-1.0-pro-002/answer_gen/v1"
            }
        }
    },
    servingConfig: client.projectLocationCollectionDataStoreServingConfigPath(
        process.env.PROJECT_ID || "-",
        location,
        process.env.VAIS_COLLECTION_ID || "default_collection",
        process.env.VAIS_DATASTORE_ID || "-",
        process.env.VAIS_SERVER_CONFIG || "default_config"
    ),
  };
  const IResponseParams = {
    ISearchResult: 0,
    ISearchRequest: 1,
    ISearchResponse: 2,
  };
  const response = await client.search(request, {autoPaginate: false});
  return response[IResponseParams.ISearchResponse].summary.summaryText;
}
