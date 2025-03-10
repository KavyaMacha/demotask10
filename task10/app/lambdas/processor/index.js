const AWS = require("aws-sdk");
const axios = require("axios");
const { captureAWS } = require("aws-xray-sdk");

AWS.config.update({ region: "us-east-1" });
const dynamoDB = captureAWS(new AWS.DynamoDB.DocumentClient());

exports.handler = async (event) => {
    try {
        console.log("Fetching weather data...");

        // Start tracing segment
        const segment = AWS.XRay.getSegment() || new AWS.XRay.Segment("LambdaSegment");
        const subsegment = segment.addNewSubsegment("FetchWeatherData");

        // Fetch weather data from Open-Meteo API
        const url =
            "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m";
        const response = await axios.get(url);
        subsegment.close(); // Close tracing segment

        const weatherData = response.data.current;

        // Store data in DynamoDB
        console.log("Storing data in DynamoDB...");
        const params = {
            TableName: "Weather",
            Item: {
                id: "latest_weather",
                temperature: weatherData.temperature_2m,
                wind_speed: weatherData.wind_speed_10m,
                timestamp: new Date().toISOString(),
            },
        };

        await dynamoDB.put(params).promise();

        console.log("Weather data stored successfully.");

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Weather data stored successfully" }),
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch and store weather data" }),
        };
    }
};
