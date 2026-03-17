const mongooseUri = process.env.MONGOOSE_URI;
if (!mongooseUri) { console.error('Set MONGOOSE_URI'); process.exit(1); }
const mongoose = require('mongoose');
mongoose.connect(mongooseUri, { serverSelectionTimeoutMS: 10000 })
  .then(() => { console.log('Mongoose connected OK'); return mongoose.disconnect(); })
  .catch((err) => { console.error('Mongoose connect failed:', err && err.message); if (err && err.stack) console.error(err.stack); process.exit(1); });
