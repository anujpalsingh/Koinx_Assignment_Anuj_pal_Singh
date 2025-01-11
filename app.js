const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const Crypto = require("./models/crypto");
const dotenv = require("dotenv")
dotenv.config();



mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT;


setInterval(async () => {
    const coins = ["bitcoin", "matic-network", "ethereum"];
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(",")}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        //console.log("Fetched data:", data);  


    
        for (const coin of coins) {
            const cryptoData = new Crypto({
                coin: coin,
                price: data[coin].usd,
                marketCap: data[coin].usd_market_cap,
                change24h: data[coin].usd_24h_change
            });

            await cryptoData.save();
            console.log(`Data saved for ${coin}`);
        }

        console.log("Data saved successfully");
    } catch (error) {
        console.error("Error : ", error);
    }
},2*60*60* 1000); 



app.get("/stats", async (req, res) => {
    const { coin } = req.query;

    if (!coin) {
        return res.status(400).json({ error: "query parameter is not there" });
    }

    try {
        const latestData = await Crypto.findOne({ coin }).sort({ createdAt: -1 });
        if (!latestData) {
            return res.status(404).json({ error: "No data found" });
        }

        res.json({
            price: latestData.price,
            marketCap: latestData.marketCap,
            change24h: latestData.change24h
        });
    } catch (error) {
        console.error("Error : ", error);
    }
});




app.get("/deviation", async (req, res) => {
    const { coin } = req.query;

    if (!coin) {
        return res.json({ error: "query paramete is not there" });
    }

    try {
        const records = await Crypto.find({ coin }).sort({ createdAt: -1 }).limit(100);

        if (records.length === 0) {
            return res.status(404).json({ error: "No data found" });
        }

        const prices = records.map((record) => record.price);

        const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;

        const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
        const standardDeviation = Math.sqrt(variance);

        
        res.json({ deviation: standardDeviation.toFixed(2) });
    } catch (error) {
        console.error("Error : ", error);
    }
});



app.listen(PORT, () => {
    console.log("server is running successfully on port : ",PORT);
});
