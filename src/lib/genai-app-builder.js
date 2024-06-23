// @see https://cloud.google.com/nodejs/docs/reference/discoveryengine/latest
import { SearchServiceClient } from "@google-cloud/discoveryengine";

const location = process.env.VAIS_LOCATION || "global";
const apiEndpoint =
  location === 'global'
    ? 'discoveryengine.googleapis.com'
    : `${location}-discoveryengine.googleapis.com`;
const client = new SearchServiceClient({apiEndpoint: apiEndpoint});

const model = process.env.VAIS_SUMMARY_MODEL || "gemini-1.5-flash-001/answer_gen/v1";

export default async function (question) {
  const request = {
    query: question,
    pageSize: 10,
    queryExpansionSpec: {condition: "AUTO"},
    spellCorrectionSpec: {mode: "AUTO"},
    contentSearchSpec: {
        summarySpec: {
            ignoreAdversarialQuery: true,
            includeCitations: true,
            summaryResultCount: 5,
            modelSpec: {version: model},
            modelPromptSpec: {
              preamble: "Given the conversation between a user and a helpful assistant and some search results, create a final answer for the assistant. The answer should use all relevant information from the search results, not introduce any additional information, and use exactly the same words as the search results when possible. The assistant's answer should be brief, no more than 1 or 2 sentences.\n\nAnd avoid the following topics:\n- NEWS\n- SNS"
            }
        }
    },
    snippetSpec: {returnSnippet: true},
    servingConfig: client.projectLocationCollectionDataStoreServingConfigPath(
        process.env.GOOGLE_CLOUD_PROJECT || "-",
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
