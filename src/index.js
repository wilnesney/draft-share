//TODO: https://expressjs.com/en/advanced/best-practice-security.html

const path = require('path');
const express = require('express');
const hbs = require('hbs');
const { QuillDeltaToHtmlConverter } = require('quill-delta-to-html');

require('./db/mongoose');
const Draft = require('./models/draft');

const app = express()

// Define paths for Express config.
const publicDirectoryPath = path.join(__dirname, '../public');
const viewsPath = path.join(__dirname, '../templates/views'); // Default is /views
const partialsPath = path.join(__dirname, '../templates/partials');

// Set up handlebars engine and views location (for dynamic content/templates).
app.set('view engine', 'hbs');
app.set('views', viewsPath);
hbs.registerPartials(partialsPath); // Note: hbs., not app.

// Set up directory for static content.
app.use(express.static(publicDirectoryPath));

// Automatically parse incoming JSON for our request handlers
// (Doesn't handle bad JSON gracefully)
app.use(express.json());  

// Source for below: https://stackoverflow.com/questions/58134287/catch-error-for-bad-json-format-thrown-by-express-json-middleware
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error(err);
        return res.status(400).send({ message: err.message }); // Bad request
    }
    next();
});

const draftToResponseObject = draft => {
    const quillConfig = {
        multiLineParagraph: false,
    };
    const body = new QuillDeltaToHtmlConverter(draft.body.ops, quillConfig).convert();

    return {
        title: draft.title,
        author: draft.author,
        body,
    };
}

// API
app.post('/api/draft', async (req, res) => {
    try {
        if (!req.body.hours || req.body.hours < 1 || req.body.hours > 24) {
            return res.status(400).send();
        }

        const expireAt = new Date();
        expireAt.setHours(expireAt.getHours() + req.body.hours);

        const draft = new Draft({
            body: req.body.body,
            author: req.body.author,
            title: req.body.title,
            password: req.body.password,
            expireAt, 
        })

        await draft.save();

        const portString = (process.env.PORT !== 80 && process.env.PORT !== 443) ? `:${process.env.PORT}` : '';
        const path = `${req.protocol}://${req.hostname}${portString}/${draft.password ? 'private' : 'public'}/${draft._id}`;

        res.status(201).send({ path });
    } catch (e) {
        console.log(e.message);
        res.status(500).send();
    }
});

// Note: This is a POST because there's authentication involved.
app.post('/api/private/:id', async (req, res) => {
    const _id = req.params.id;
    const password = req.body.password;

    try {
        const draft = await Draft.findByCredentials(_id, password);
        if (!draft) {
            return res.status(404).send();
        }
        res.send(draftToResponseObject(draft));
    } catch (e) {
        console.error(e);
        res.status(500).send();
    }
})

// Pages

app.get('/', (req, res) => {
    res.render('editor', {
        title: 'Home | Draft Share'
    })
})

// Deliver a public (i.e., not password-protected) page.
app.get('/public/:id', async (req, res) => {
    const _id = req.params.id;

    try {
        const draft = await Draft.findById(_id);
        // This is the public area--if there's an associated password, don't allow access!
        if (!draft || draft.password) {
            return res.status(404).send();
        }

        res.render('public-viewer', draftToResponseObject(draft));
    } catch (e) {
        console.error(e);
        res.status(500).send();
    }
});

// For private pages, we just serve the unpopulate page.
// Users must enter a password and make a fetch request to the /api for private
// to get the data.
app.get('/private/:id', (req, res) => {
    res.render('private-viewer', {});
});


app.get('*', (req, res) => {
    res.render('404', {
        title: 'Oh, no!',
        errorText: `Sorry! We couldn't find that page. The page you're looking for may have expired, or your password may be incorrect.`,
        name: 'Dave Turka',
    })
})

//Note: Render.com handles https automatically.
app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}`);
})
    