// Archivo que servirá de centro de comandos para el CRUD en archivos JSON
import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';

// Creación de constantes - Rutas para acceder a los datos y a los logs
const DATA_PATH = path.join(process.cwd(), 'public', 'data');
const LOG_PATH = path.join(process.cwd(), 'logs', 'activity.log');

// Función auxiliar que sirve para guardar todos los hitos en un archivo LOG (leer, escribir, error)
const registrarActividad = (mensaje) => {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const logEntrada = `[${timestamp}] ${mensaje}\n`;
    // Acá uso el módulo (LIBRERÍA) 'fs' para guardar o leer datos en el disco
    fs.appendFileSync(LOG_PATH, logEntrada);
};

// Función para guardar los datos en un archivo JSON
export const crearRegistroJSON = (data) => {
    try{
        // Generar el nombre del JSON = 2026-07-13_22-49-07.json
        const fileName = `${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.json`;
        const filePath = path.join(DATA_PATH, fileName);

        // Escribir el contenido del JSON
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

        // Registrar la actividad en el LOG
        registrarActividad(`CREACIÓN - Archivo ${fileName} generado con éxito.`);

        return fileName;
    } catch (error) {
        registrarActividad(`ERROR - Falló al crear el registro JSON. Detalle = ${error.message}`);
        throw new Error("No se pudo persistir el archivo JSON en el disco.");
    }
};

// Función para leer los datos de un archivo JSON
export const leerRegistroJSON = (fileName) => {
    try{
        const filePath = path.join(DATA_PATH, fileName);
        const dataRaw = fs.readFileSync(filePath, 'utf-8');

        registrarActividad(`LECTURA - Archivo ${fileName} leído con éxito.`);
        return JSON.parse(dataRaw);
    } catch(error) {
        registrarActividad(`ERROR - Falló al leer el registro JSON. Detalle = ${error.message}`);
        throw new Error("No se pudo leer el archivo JSON ubicado en el disco.");
    }
};