/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-extraneous-dependencies,no-unused-vars */
const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");

const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient();
const { EVENTS_TABLE } = process.env;

const queryItem = async (params, fetchAllData = true) => {
  const result = [];
  let response;
  do {
    const command = new QueryCommand(params);
    response = await client.send(command);
    result.push(...response.Items);
    if (response.LastEvaluatedKey)
      params.ExclusiveStartKey = response.LastEvaluatedKey;
  } while (fetchAllData && response.LastEvaluatedKey);

  // converting DynamoDB JSON to normal JSON
  const unmarshalledData = result.length
    ? result.map((item) => unmarshall(item))
    : [];
  return {
    items: unmarshalledData,
    lastEvaluatedKey: response.LastEvaluatedKey || null,
  };
};

const fetchEvent = async (eventId) => {
  const params = {
    TableName: EVENTS_TABLE,
    KeyConditionExpression: "eventId = :eventId",
    ExpressionAttributeValues: marshall({ ":eventId": eventId }),
  };
  const data = (await queryItem(params)).items;
  return data;
};

const handler = async (event) => {
  console.log("EVENT-", JSON.stringify(event));
  const { eventId } = event;

  try {
    const eventDetails = await fetchEvent(eventId);
    return {
      statusCode: 200,
      body: eventDetails,
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: error,
    };
  }
};

module.exports = {
  handler,
};
