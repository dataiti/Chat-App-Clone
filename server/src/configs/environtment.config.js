import "dotenv/config";

export const env = {
     BUILD_MODE: process.env.BUILD_MODE,

     APP_HOST: process.env.APP_HOST,
     APP_PORT: process.env.APP_PORT,

     MONGODB_URI: process.env.MONGODB_URI,
     DATABASE_NAME: process.env.DATABASE_NAME,

     ADMIN_EMAIL: process.env.ADMIN_EMAIL,
     ADMIN_EMAIL_PASSWORD: process.env.ADMIN_EMAIL_PASSWORD,

     CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
     CLOUDINARY_KEY: process.env.CLOUDINARY_KEY,
     CLOUDINARY_SECRET: process.env.CLOUDINARY_SECRETprocess,

     CLIENT_DOMAIN: process.env.CLIENT_DOMAIN,

     ACCESS_TOKEN_SECRET_SIGNATURE: process.env.ACCESS_TOKEN_SECRET_SIGNATURE,
     REFRESH_TOKEN_SECRET_SIGNATURE: process.env.REFRESH_TOKEN_SECRET_SIGNATURE,
};
