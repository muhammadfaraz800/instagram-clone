import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.Mixed, // Can be user ID string or "Anonymous" or null
        default: null
    },
    log_type: {
        type: String,
        required: true,
        enum: ['user', 'error', 'system', 'security'] // Flexible
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    meta: {
        type: mongoose.Schema.Types.Mixed, // Any extra info like error stack, IP, etc.
        default: {}
    }
}, {
    collection: 'user_logs' // Strictly using this collection as requested
});

const Log = mongoose.model('Log', logSchema);

export default Log;
