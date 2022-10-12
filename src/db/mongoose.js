const mongoose = require('mongoose');

const tryConnection = () => {
    mongoose.connect(process.env.MONGODB_URL)
        .catch(error => {
            console.error(`Error connecting to database at ${process.env.MONGODB_URL}: `, error);
            setTimeout(tryConnection, 60 * 1000);
        })
}

tryConnection();