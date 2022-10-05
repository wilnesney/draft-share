const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const SALT_ITERATIONS = 12;

const draftSchema = new mongoose.Schema({
    title: {
        type: String,
        required: false,
        trim: true,
    },
    author: {
        type: String,
        required: false,
        trim: true,
    },
    body: {
        type: mongoose.Mixed,
        required: true,
        validate(value) {
            const allowedAttributes = ['bold', 'italic', 'underline'];
            value.ops.forEach(op => {
                if (op.attributes) {
                    const attrs = Object.keys(op.attributes);
                    attrs.forEach(attr => {
                        if (!allowedAttributes.includes(attr)) {
                            throw new Error('Invalid attribute');   //TODO: Test! And restrict what Quill will accept!
                        }
                    })
                }
            })
        }
    }, 
    expireAt: {
        type: Date,
        required: true,
        index: {
            expireAfterSeconds: 0, 
        },        
    },
    password: {
        type: String,
        required: false,  // Users don't need to password-protect drafts if they don't want
        trim: true,
    }
})

draftSchema.statics.findByCredentials = async function(id, password) {
    const draft = await Draft.findById(id);

    if (!draft || !draft.password)
    {
        return undefined;
    }

    const isMatch = await bcrypt.compare(password, draft.password);
    if (!isMatch) {
        return undefined
    }

    return draft;
}

draftSchema.methods.toJSON = function() {
    const draft = this;
    const draftObject = draft.toObject();

    delete draftObject.password;

    return draftObject;
}

// Hash plaintext password before saving.
// Note: Can't use arrow function since we need 'this' access.
draftSchema.pre('save', async function(next) {
    const draft = this;

    if (draft.password) {
        draft.password = await bcrypt.hash(draft.password, SALT_ITERATIONS);
    }
    
    next();
})

const Draft = mongoose.model('Draft', draftSchema);


module.exports = Draft;