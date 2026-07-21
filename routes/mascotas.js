import express from "express";
import validator from 'validator';
import dayjs from 'dayjs';
import 'dayjs/locale/es.js';

import {registrarActividad} from "../helpers/logger.js";
import {estaAutenticado} from "../middlewares/auth.js";
import {getDbClient} from "../helpers/database.js";

dayjs.locale("es");

const router = express.Router();

// Activación del Middleware que valida si el usuario está autenticado para acceder a las rutas de abajo
router.use(estaAutenticado);

// GET | RUTA DE INICIO (/)
// Si el usuario está autenticado, redirecciona a la VISTA de inicio de mascotas (mascotas.ejs)
router.get('/', async (req, res) => {
    const conexion = getDbClient();
    try{
        registrarActividad(`🌐 GET /mascotas - Acceso autorizado para ${req.session.usuario.email}.}`);

        await conexion.connect();
        const consultaSQL = `SELECT * FROM mascotas ORDER BY id DESC;`;
        const resultadoSQL = await conexion.query(consultaSQL);

        const listaMascotas = resultadoSQL.rows.map();

        res.render('mascotas', {
            title: 'Mis Mascotas | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            listaMascotas
        });
    } catch (error) {
        registrarActividad(`❌ GET /mascotas - Error Crítico: ${error.message}`);
        res.status(500).render('error',{
            message: 'No pudimos cargar el listado de mascotas en este momento.',
            error: {status:500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    } finally {
      await conexion.end();
    }
});

export default router;