const mongoose = require('mongoose');



const tryConnection = () => {
    mongoose.connect(process.env.MONGODB_URL)
        .catch(error => {
            console.error('Error connecting to database: ', error);
            setTimeout(tryConnection, 60 * 1000);
        })
}

tryConnection();