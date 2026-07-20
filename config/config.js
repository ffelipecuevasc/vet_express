import dotenv from 'dotenv';
import {registrarActividad} from "../helpers/logger.js";

// Inicializar dotenv: esto va a leer el archivo .env y lo inyectará en la memoria RAM
// Crear una configuración DEFENSIVA: al más mínimo error se cae toda

dotenv.config();

registrarActividad(`⚙️ SISTEMA: Cargando variables de entorno desde el archivo .env.`);

const REQUIRED_ENV_VARS = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'SESSION_SECRET'
];

REQUIRED_ENV_VARS.forEach((envVar) => {
    if(!process.env[envVar]){
        console.error(`❌ ERROR: Falta la variable de entorno obligatoria -> ${envVar}`);
        // Preocuparme por guardar estos registros (logs) se llama OBSERVABILIDAD
        registrarActividad(`❌ SISTEMA ERROR: Falta la variable de entorno obligatoria -> ${envVar}`);
        process.exit(1);
    }
});

registrarActividad(`⚙️ SISTEMA: Todas las variables de entorno fueron validadas con éxito.`);

export const config = {
    db: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    },
    email: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
    },
    session: {
        secret: process.env.SESSION_SECRET,
    }
};