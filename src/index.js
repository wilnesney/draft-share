//TODO: https://expressjs.com/en/advanced/best-practice-security.html

const path = require('path');
const express = require('express');
const hbs = require('hbs');
const logger = require('pino')();
const { QuillDeltaToHtmlConverter } = require('quill-delta-to-html');
// Local requires
require('./db/mongoose');
const Draft = require('./models/draft');

const app = express()

// Define paths for Express config.
const publicDirectoryPath = path.join(__dirname, '../public');
const viewsPath = path.join(__dirname, '../templates/views'); // Default is /views
const partialsPath = path.join(__dirname, '../templates/partials');

//TODO: Gzip

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
        logger.warn(err);
        return res.status(400).send({ 'error': 'Your request was formatted incorrectly.' }); // Bad request
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

// Convenience function for logging basic request info.
//TODO: May eventually want to move to pino-http or similar, but this is good enough for now.
//TODO: Might also just want to make this a middleware.
const logRequest = req => logger.info({ method: req.method, path: req.path, });

const hasItem = item => (typeof(item) === 'string' && item.length > 0);

// API
app.post('/api/draft', async (req, res) => {
    logRequest(req);
    try {
        if (!req.body.hours || req.body.hours < 1 || req.body.hours > 12) {
            logger.warn(`Invalid draft lifetime: "${req.body.hours}"`);
            return res.status(400).send({'error': 'Requested time was invalid.'});
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

        logger.info({ newDraftStats: { 
            lifetime: req.body.hours, 
            hasTitle: hasItem(req.body.title),
            hasAuthor: hasItem(req.body.author),
            hasPassword: hasItem(req.body.password),
            // Content-Length isn't exactly what we want, 
            // but it's faster than calculating actual body length
            requestContentLength: req.headers['content-length'], 
        } })

        const portString = process.env.IS_DEV ? `:${process.env.PORT}` : '';
        const path = `${req.protocol}://${req.hostname}${portString}/${draft.password ? 'private' : 'public'}/${draft._id}`;

        res.status(201).send({ path });
    } catch (e) {
        logger.error(e);
        res.status(500).send({'error': 'Sorry! Something went wrong. Please try again later.'});
    }
});

// Note: This is a POST because there's authentication involved.
app.post('/api/private/:id', async (req, res) => {
    logRequest(req);
    const _id = req.params.id;
    const password = req.body.password;

    try {
        const draft = await Draft.findByCredentials(_id, password);
        if (!draft) {
            // Return 404 after 5-6 seconds
            logger.warn(`Private draft "${_id}" not found or wrong password`);
            return setTimeout(() => res.status(404).send(), (5 + Math.random()) * 1000 )
        }
        res.send(draftToResponseObject(draft));
    } catch (e) {
        logger.error(e);
        res.status(500).send({'error': 'Sorry! Something went wrong. Please try again later.'});
    }
})

// Pages

app.get('/', (req, res) => {
    logRequest(req);
    res.render('editor', {
        siteName: 'Draft Share',
        title: 'Home',
        name: 'Dave Turka',
        currentYear: new Date().getFullYear(),
    })
})

// Deliver a public (i.e., not password-protected) page.
app.get('/public/:id', async (req, res) => {
    logRequest(req);
    const _id = req.params.id;

    try {
        const draft = await Draft.findById(_id);
        // This is the public area--if there's an associated password, don't allow access!
        if (!draft || draft.password) {
            if (!draft) {
                logger.warn(`Public draft "${_id}" not found`);
            } else {
                logger.warn(`Attempt to view password-protected "${_id}" with public endpoint`);
            }

            return res.status(404).render('404', {
                siteName: 'Draft Share',
                title: 'Oh, no!',
                errorText: `Sorry! We couldn't find that page. The page you're looking for may have expired or the URL may be incorrect.`,
                name: 'Dave Turka',
                name: 'Dave Turka',
                currentYear: new Date().getFullYear(),
            })
        }

        res.render('public-viewer', {
            ...draftToResponseObject(draft),
            siteName: 'Draft Share',
            name: 'Dave Turka',
            currentYear: new Date().getFullYear(),
        });
    } catch (e) {
        logger.error(e);
        res.status(500).send();
    }
});

// For private pages, we just serve the unpopulate page.
// Users must enter a password and make a fetch request to the /api for private
// to get the data.
app.get('/private/:id', (req, res) => {
    logRequest(req);
    res.render('private-viewer', {
        siteName: 'Draft Share',
        name: 'Dave Turka',
        currentYear: new Date().getFullYear(),
    });
});

app.get('/about', (req, res) => {
    logRequest(req);
    res.render('about', {
        siteName: 'Draft Share',
        title: 'About',
        name: 'Dave Turka',
        currentYear: new Date().getFullYear(),
    });
});

/* Consider wiring this back up some day if there's appropriate content.
app.get('/help', (req, res) => {
    logRequest(req);
    res.render('help', {
        siteName: 'Draft Share',
        title: 'Help',
        name: 'Dave Turka',
        currentYear: new Date().getFullYear(),
    });
});
*/


app.get('*', (req, res) => {
    logRequest(req);
    res.render('404', {
        siteName: 'Draft Share',
        title: 'Oh, no!',
        errorText: `Sorry! We couldn't find that page. The page you're looking for may have expired, the URL may be incorrect, or your password may be wrong.`,
        name: 'Dave Turka',
        currentYear: new Date().getFullYear(),
    })
})

//Note: Render.com handles https automatically.
app.listen(process.env.PORT, () => {
    logger.info(`Server listening on port ${process.env.PORT}`);
})
    