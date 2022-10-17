const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL)
    .catch(error => {
        // If we can't connect to the database at startup, exit the application. 
        // Process management should restart (and thus retry) in production.
        console.error(`Exiting. Error connecting to database at ${process.env.MONGODB_URL}: `, error);
        process.exit(1);
    });