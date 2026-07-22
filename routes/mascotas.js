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

/* -------------------------------------------
 * CRUD - READ
 * GET | RUTA DE INICIO (/)
 * -------------------------------------------
 * Si el usuario está autenticado, redirecciona a la VISTA de inicio de mascotas (mascotas.ejs)
 */
router.get('/', async (req, res) => {
    const conexion = getDbClient();
    try{
        registrarActividad(`🌐 GET /mascotas - Acceso autorizado para ${req.session.usuario.email}.}`);

        await conexion.connect();
        const consultaSQL = `SELECT * FROM mascotas ORDER BY id DESC;`;
        const resultadoSQL = await conexion.query(consultaSQL);

        const listaMascotas = resultadoSQL.rows.map((mascota) => ({
            // Esto ahora es un diccionario
            id: mascota.id,
            nombre: mascota.nombre,
            especie: mascota.especie,
            raza: mascota.raza,
            edad: mascota.edad,
            sexo: mascota.sexo,
            fechaIngreso: mascota.fecha_ingreso,
            fechaIngresoFormateada: dayjs(mascota.fecha_ingreso).format('DD/MM/YYYY')
        }));

        res.render('mascotas', {
            title: 'Mis Mascotas | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            listaMascotas
        });
    } catch (error) {
        registrarActividad(`❌ GET /mascotas - Error Crítico: ${error.message}`);
        res.status(500).render('error',{
            message: 'No pudimos cargar el listado de mascotas desde la BD en este momento.',
            error: {status:500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    } finally {
      await conexion.end();
    }
});

/* -------------------------------------------
 * CRUD - CREATE
 * GET | RUTA PARA MOSTRAR LA VISTA EJS PARA CREAR MASCOTAS (/crear)
 * -------------------------------------------
 * Si el usuario está autenticado, redirecciona a la VISTA que muestra un formulario para crear mascotas (mascotas_create.ejs)
 */
router.get('/crear', (req, res) => {
    registrarActividad(`🌐 GET /mascotas/crear - Acceso autorizado para ${req.session.usuario.email}.}`);
    res.render('mascotas_create', {
        title: 'Registrar Mascota | VetCare Pro',
        nombreClinica: 'VetCare Pro'
    });
});

/* -------------------------------------------
 * CRUD - CREATE
 * POST | RUTA PARA REGISTRAR EN LA BD UNA NUEVA MASCOTA (/crear)
 * -------------------------------------------
 * Si el usuario está autenticado, procedemos a conectarnos a PostgreSQL y realizar el ingreso de la nueva mascota
 */
router.post('/crear', async (req, res) => {
    const conexion = getDbClient();
    try {
        const {nombre, especie, raza, edad, sexo} = req.body;

        // Validamos las variables que llegaron del formulario HTML (mascotas_create.ejs)
        if (!nombre || !especie || !sexo || !raza || edad === undefined || edad === '') {
            registrarActividad(`🌐❌ POST /mascotas/crear - ERROR: Datos incompletos en el formulario (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'Debes completar todos los campos del formulario: nombre, especie, raza, edad y sexo de la mascota.',
                error: {status:400, stack:'Revisa el formulario e intenta nuevamente'},
                nombreClinica: 'VetCare Pro'
            });
        }

        // Validar la edad: esta llega como texto desde el formulario HTML, por lo que debemos convertirla
        const edadNumerica = Number(edad);
        if (!Number.isInteger(edadNumerica) || edadNumerica < 0 ) {
            registrarActividad(`🌐❌ POST /mascotas/crear - ERROR: Edad inválida (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'La edad debe ser un número entero mayor o igual a 0.',
                error: {status:400, stack:'Revisa el campo de edad en el formulario e intenta nuevamente'},
                nombreClinica: 'VetCare Pro'
            });
        }

        // Validar el sexo: debe ser 'Macho' o 'Hembra', de lo contrario lanzamos un error (vista EJS de error)
        if (!['Macho', 'Hembra'].includes(sexo)) {
            registrarActividad(`🌐❌ POST /mascotas/crear - ERROR: Sexo inválido (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El sexo debe ser Macho o Hembra.',
                error: {status:400, stack:'Revisa el campo de sexo en el formulario e intenta nuevamente'},
                nombreClinica: 'VetCare Pro'
            });
        }

        // Realizamos la conexión a PostgreSQL
        await conexion.connect();

        // Preparamos la sentencia SQL para realizar el INSERT a la BD
        // Acá realizamos un INSERT parametrizado: evita la vulnerabilidad de inyecciones SQL
        const insertSQL = `INSERT INTO mascotas (nombre, especie, raza, edad, sexo) VALUES ($1, $2, $3, $4, $5);`;

        // Procedemos a validar (escapar) los datos que llegaron del formulario HTML
        const valores = [
            validator.escape(nombre),
            validator.escape(especie),
            validator.escape(raza),
            edadNumerica,
            sexo
        ];

        // Ahora inyectamos la variables reales al INSERT parametrizado
        await conexion.query(insertSQL, valores);

        registrarActividad(`🌐 POST /mascotas/crear - ÉXITO: Mascota ${nombre} registrada exitosamente en la BD (${req.session.usuario.email}).`);

        res.redirect('/mascotas');
    } catch (error) {
        registrarActividad(`❌ POST /mascotas/crear - Error Crítico: ${error.message}`);
        res.status(500).render('error',{
            message: 'No pudimos registrar la mascota en la BD en este momento.',
            error: {status:500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    } finally {
        await conexion.end();
    }
});

/* -------------------------------------------
 * CRUD - UPDATE
 * GET | RUTA PARA MOSTRAR LA VISTA EJS PARA EDITAR UNA MASCOTA (/id/editar)
 * -------------------------------------------
 * Si el usuario está autenticado, redirecciona a la VISTA que muestra un formulario para editar una mascota (mascotas_update.ejs)
 */
router.get('/:id/editar', async (req, res) => {
    const conexion = getDbClient();
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`🌐❌ GET /mascotas/id/editar - ERROR: Identificador inválido (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El identificador debe ser un número entero mayor o igual a 0.',
                error: {status:400, stack:'Revisa el enlace e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        await conexion.connect();
        const selectSQL = `SELECT * FROM mascotas WHERE id = $1;`;
        const resultadoSQL = await conexion.query(selectSQL, [id]);

        if (resultadoSQL.rows.length === 0) {
            registrarActividad(`🌐❌ GET /mascotas/id/editar - ERROR: Mascota inexistente (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'La mascota con ese identificador no existe.',
                error: {status:400, stack:'Verifica el listado y reintenta.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`🌐 GET /mascotas/id/editar - Formulario de edición de mascota solicitado y en proceso de carga (${req.session.usuario.email}).`);
        res.render('mascotas_update', {
            title: 'Editar Mascota | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            mascota: resultadoSQL.rows[0]
        });

    } catch (error) {
        registrarActividad(`❌ GET /mascotas/id/editar - Error Crítico: ${error.message}`);
        res.status(500).render('error',{
            message: 'No pudimos editar la mascota en la BD en este momento.',
            error: {status:500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    } finally {
        await conexion.end();
    }
});

/* -------------------------------------------
 * CRUD - UPDATE
 * POST | RUTA PARA EDITAR EN LA BD UNA MASCOTA EXISTENTE (/id/editar)
 * -------------------------------------------
 * Si el usuario está autenticado, procedemos a conectarnos a PostgreSQL y realizar la edición de una mascota existente
 */
router.post('/:id/editar', async (req, res) => {
    const conexion = getDbClient();
    try {
        const id = Number(req.params.id);
        const {nombre, especie, raza, edad, sexo} = req.body;

        // Validamos el ID
        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`🌐❌ POST /mascotas/id/editar - ERROR: Identificador inválido (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El identificador debe ser un número entero mayor o igual a 0.',
                error: {status:400, stack:'Revisa el enlace e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        // Validamos las variables que llegaron del formulario HTML (mascotas_create.ejs)
        if (!nombre || !especie || !sexo || !raza || edad === undefined || edad === '') {
            registrarActividad(`🌐❌ POST /mascotas/id/editar - ERROR: Datos incompletos en el formulario (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'Debes completar todos los campos del formulario: nombre, especie, raza, edad y sexo de la mascota.',
                error: {status:400, stack:'Revisa el formulario e intenta nuevamente'},
                nombreClinica: 'VetCare Pro'
            });
        }

        // Validar la edad: esta llega como texto desde el formulario HTML, por lo que debemos convertirla
        const edadNumerica = Number(edad);
        if (!Number.isInteger(edadNumerica) || edadNumerica < 0 ) {
            registrarActividad(`🌐❌ POST /mascotas/id/editar - ERROR: Edad inválida (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'La edad debe ser un número entero mayor o igual a 0.',
                error: {status:400, stack:'Revisa el campo de edad en el formulario e intenta nuevamente'},
                nombreClinica: 'VetCare Pro'
            });
        }

        // Validar el sexo: debe ser 'Macho' o 'Hembra', de lo contrario lanzamos un error (vista EJS de error)
        if (!['Macho', 'Hembra'].includes(sexo)) {
            registrarActividad(`🌐❌ POST /mascotas/id/editar - ERROR: Sexo inválido (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El sexo debe ser Macho o Hembra.',
                error: {status:400, stack:'Revisa el campo de sexo en el formulario e intenta nuevamente'},
                nombreClinica: 'VetCare Pro'
            });
        }

        await conexion.connect();

        const updateSQL = `UPDATE mascotas SET nombre = $1, especie = $2, raza = $3, edad = $4, sexo = $5 WHERE id = $6;`;

        const valores = [
            validator.escape(nombre),
            validator.escape(especie),
            validator.escape(raza),
            edadNumerica,
            sexo,
            id
        ];

        const resultado = await conexion.query(updateSQL, valores);

        if (resultado.rowCount === 0) {
            registrarActividad(`🌐❌ POST /mascotas/id/editar - ERROR: Mascota inexistente (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'La mascota con ese identificador no existe.',
                error: {status:400, stack:'Verifica el listado y reintenta.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`🌐 POST /mascotas/id/editar - ÉXITO: Mascota ${nombre} editada exitosamente en la BD (${req.session.usuario.email}).`);
        res.redirect('/mascotas');

    } catch (error) {
        registrarActividad(`❌ POST /mascotas/id/editar - Error Crítico: ${error.message}`);
        res.status(500).render('error',{
            message: 'No pudimos editar la mascota en la BD en este momento.',
            error: {status:500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    } finally {
        await conexion.end();
    }
});

/* -------------------------------------------
 * CRUD - DELETE
 * POST | RUTA PARA ELIMINAR DE LA BD UNA MASCOTA EXISTENTE (/id/eliminar)
 * -------------------------------------------
 * Si el usuario está autenticado, procedemos a conectarnos a PostgreSQL y realizar la eliminación de la mascota seleccionada
 */
router.post('/:id/eliminar', async (req, res) => {
    const conexion = getDbClient();
    try {
        const id = Number(req.params.id);

        // Validamos el ID
        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`🌐❌ POST /mascotas/id/eliminar - ERROR: Identificador inválido (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El identificador debe ser un número entero mayor o igual a 0.',
                error: {status:400, stack:'Revisa el enlace e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        await conexion.connect();

        const deleteSQL = `DELETE FROM mascotas WHERE id = $1;`;
        const resultado = await conexion.query(deleteSQL, [id]);

        if (resultado.rowCount === 0) {
            registrarActividad(`🌐❌ POST /mascotas/id/eliminar - ERROR: Mascota inexistente (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'La mascota con ese identificador no existe.',
                error: {status:400, stack:'Verifica el listado y reintenta.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`🌐 POST /mascotas/id/eliminar - ÉXITO: Mascota eliminada exitosamente de la BD (${req.session.usuario.email}).`);
        res.redirect('/mascotas');

    } catch (error) {
        registrarActividad(`❌ POST /mascotas/id/eliminar - Error Crítico: ${error.message}`);
        res.status(500).render('error',{
            message: 'No pudimos eliminar la mascota de la BD en este momento.',
            error: {status:500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    } finally {
        await conexion.end();
    }
});

export default router;