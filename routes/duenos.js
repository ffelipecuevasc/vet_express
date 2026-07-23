import express from "express";
import validator from 'validator';
import dayjs from 'dayjs';
import 'dayjs/locale/es.js';


import { estaAutenticado } from "../middlewares/auth.js";
import { registrarActividad } from "../helpers/logger.js";
import Dueno from "../models/dueno.js";


dayjs.locale('es');


const router = express.Router();


router.use(estaAutenticado);


/* -------------------------------------------
* CRUD - READ
* GET | RUTA DE INICIO (/)
* -------------------------------------------
* Si el usuario está autenticado, muestra el listado de dueños (duenos.ejs)
*/
router.get('/', async (req, res) => {
    try {
        registrarActividad(`👤 GET /duenos - Acceso autorizado para ${req.session.usuario.email}.`);


        // A diferencia de mascotas.js, acá NO hay getDbClient(), NO hay
        // conexion.connect() ni conexion.end(): Sequelize administra su propio
        // pool de conexiones por debajo. findAll() abre, usa y libera la
        // conexión internamente en una sola llamada.
        const duenos = await Dueno.findAll({
            order: [['id', 'DESC']], // mismo criterio que ya usa mascotas: el más reciente primero
        });


        // Cada elemento de "duenos" es una instancia del modelo Dueno, no un
        // objeto plano -- .toJSON() lo convierte antes de pasarlo a la vista.
        const listaDuenos = duenos.map((dueno) => {
            const d = dueno.toJSON();
            return {
                id: d.id,
                nombre: d.nombre,
                email: d.email,
                telefono: d.telefono,
                direccion: d.direccion,
                fechaRegistroFormateada: dayjs(d.fechaRegistro).format('DD/MM/YYYY'),
            };
        });


        res.render('duenos', {
            title: 'Dueños | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            listaDuenos,
        });
    } catch (error) {
        registrarActividad(`❌ GET /duenos - Error Crítico: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos cargar el listado de dueños en este momento.',
            error: { status: 500, stack: error.message },
            nombreClinica: 'VetCare Pro',
        });
    }
});


/* -------------------------------------------
* CRUD - CREATE
* GET | RUTA PARA MOSTRAR EL FORMULARIO DE CREACIÓN (/crear)
* ------------------------------------------- */
router.get('/crear', (req, res) => {
    registrarActividad(`👤 GET /duenos/crear - Acceso autorizado para ${req.session.usuario.email}.`);
    res.render('duenos_create', {
        title: 'Registrar Dueño | VetCare Pro',
        nombreClinica: 'VetCare Pro',
    });
});


/* -------------------------------------------
* CRUD - CREATE
* POST | RUTA PARA REGISTRAR UN NUEVO DUEÑO (/crear)
* ------------------------------------------- */
router.post('/crear', async (req, res) => {
    try {
        const { nombre, email, telefono, direccion } = req.body;


        // 1. Campos obligatorios no vacíos (mismo criterio que mascotas)
        if (!nombre || !email || !telefono) {
            registrarActividad(`👤❌ POST /duenos/crear - RECHAZADO: Datos incompletos en el formulario (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'Debes completar nombre, email y teléfono del dueño.',
                error: { status: 400, stack: 'Revisa el formulario e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        // 2. Formato de email (mismo criterio que autenticacion.js)
        if (!validator.isEmail(email)) {
            registrarActividad(`👤❌ POST /duenos/crear - RECHAZADO: Email inválido (${email}).`);
            return res.status(400).render('error', {
                message: 'El correo electrónico ingresado no tiene un formato válido.',
                error: { status: 400, stack: 'Revisa el campo de email e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        // 3. Creación vía Sequelize -- fechaRegistro NO se envía, PostgreSQL
        //    aplica su propio DEFAULT CURRENT_DATE (ver Fase 4).
        await Dueno.create({
            nombre: validator.escape(nombre),
            email: email,
            telefono: validator.escape(telefono),
            direccion: direccion ? validator.escape(direccion) : null,
        });


        registrarActividad(`👤 POST /duenos/crear - ÉXITO: Dueño ${nombre} registrado exitosamente (${req.session.usuario.email}).`);


        res.redirect('/duenos');
    } catch (error) {
        // Violación de la restricción UNIQUE sobre email
        if (error.name === 'SequelizeUniqueConstraintError') {
            registrarActividad(`👤❌ POST /duenos/crear - RECHAZADO: Email duplicado (${req.body.email}).`);
            return res.status(409).render('error', {
                message: 'Ese correo electrónico ya está registrado por otro dueño.',
                error: { status: 409, stack: 'Verifica el listado o usa un email distinto.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        registrarActividad(`❌ POST /duenos/crear - Error Crítico: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos registrar el dueño en este momento.',
            error: { status: 500, stack: error.message },
            nombreClinica: 'VetCare Pro'
        });
    }
});


/* -------------------------------------------
* CRUD - UPDATE
* GET | RUTA PARA MOSTRAR EL FORMULARIO DE EDICIÓN (/:id/editar)
* ------------------------------------------- */
router.get('/:id/editar', async (req, res) => {
    try {
        const id = Number(req.params.id);


        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`👤❌ GET /duenos/id/editar - ERROR: Identificador inválido (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El identificador debe ser un número entero mayor o igual a 0.',
                error: { status: 400, stack: 'Revisa el enlace e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        // findByPk() devuelve la instancia si existe, o null si no hay
        // coincidencia -- a diferencia de SQL crudo, donde "no encontrado"
        // es un array vacío que hay que revisar con .rows.length === 0.
        const dueno = await Dueno.findByPk(id);


        if (!dueno) {
            registrarActividad(`👤❌ GET /duenos/id/editar - ERROR: Dueño inexistente (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El dueño con ese identificador no existe.',
                error: { status: 400, stack: 'Verifica el listado y reintenta.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        registrarActividad(`👤 GET /duenos/id/editar - Formulario de edición de dueño solicitado y en proceso de carga (${req.session.usuario.email}).`);
        res.render('duenos_update', {
            title: 'Editar Dueño | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            dueno: dueno.toJSON(),
        });


    } catch (error) {
        registrarActividad(`❌ GET /duenos/id/editar - Error Crítico: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos cargar el formulario de edición en este momento.',
            error: { status: 500, stack: error.message },
            nombreClinica: 'VetCare Pro'
        });
    }
});


/* -------------------------------------------
* CRUD - UPDATE
* POST | RUTA PARA GUARDAR LA EDICIÓN DE UN DUEÑO (/:id/editar)
* ------------------------------------------- */
router.post('/:id/editar', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nombre, email, telefono, direccion } = req.body;


        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`👤❌ POST /duenos/id/editar - ERROR: Identificador inválido (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El identificador debe ser un número entero mayor o igual a 0.',
                error: { status: 400, stack: 'Revisa el enlace e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        if (!nombre || !email || !telefono) {
            registrarActividad(`👤❌ POST /duenos/id/editar - RECHAZADO: Datos incompletos en el formulario (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'Debes completar nombre, email y teléfono del dueño.',
                error: { status: 400, stack: 'Revisa el formulario e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        if (!validator.isEmail(email)) {
            registrarActividad(`👤❌ POST /duenos/id/editar - RECHAZADO: Email inválido (${email}).`);
            return res.status(400).render('error', {
                message: 'El correo electrónico ingresado no tiene un formato válido.',
                error: { status: 400, stack: 'Revisa el campo de email e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        // Mismo chequeo explícito de "no encontrado" que en el GET -- protege
        // contra un POST directo a una URL con un id que ya no existe.
        const dueno = await Dueno.findByPk(id);


        if (!dueno) {
            registrarActividad(`👤❌ POST /duenos/id/editar - ERROR: Dueño inexistente (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El dueño con ese identificador no existe.',
                error: { status: 400, stack: 'Verifica el listado y reintenta.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        // .update() sobre una instancia ya cargada genera un UPDATE ... WHERE
        // id = X, garantizando que se modifica únicamente esta fila.
        await dueno.update({
            nombre: validator.escape(nombre),
            email: email,
            telefono: validator.escape(telefono),
            direccion: direccion ? validator.escape(direccion) : null,
        });


        registrarActividad(`👤 POST /duenos/id/editar - ÉXITO: Dueño #${id} actualizado exitosamente (${req.session.usuario.email}).`);


        res.redirect('/duenos');
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            registrarActividad(`👤❌ POST /duenos/id/editar - RECHAZADO: Email duplicado (${req.body.email}).`);
            return res.status(409).render('error', {
                message: 'Ese correo electrónico ya está registrado por otro dueño.',
                error: { status: 409, stack: 'Verifica el listado o usa un email distinto.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        registrarActividad(`❌ POST /duenos/id/editar - Error Crítico: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos actualizar el dueño en este momento.',
            error: { status: 500, stack: error.message },
            nombreClinica: 'VetCare Pro'
        });
    }
});


/* -------------------------------------------
* CRUD - DELETE
* POST | RUTA PARA ELIMINAR UN DUEÑO EXISTENTE (/:id/eliminar)
* ------------------------------------------- */
router.post('/:id/eliminar', async (req, res) => {
    try {
        const id = Number(req.params.id);


        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`👤❌ POST /duenos/id/eliminar - ERROR: Identificador inválido (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El identificador debe ser un número entero mayor o igual a 0.',
                error: { status: 400, stack: 'Revisa el enlace e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        // Mismo patrón defensivo que en GET/POST /:id/editar: buscamos primero
        // con findByPk() y verificamos explícitamente el null antes de continuar.
        const dueno = await Dueno.findByPk(id);


        if (!dueno) {
            registrarActividad(`👤❌ POST /duenos/id/eliminar - ERROR: Dueño inexistente (${req.session.usuario.email}).`);
            return res.status(400).render('error', {
                message: 'El dueño con ese identificador no existe.',
                error: { status: 400, stack: 'Verifica el listado y reintenta.' },
                nombreClinica: 'VetCare Pro'
            });
        }


        // .destroy() sobre la instancia genera un DELETE ... WHERE id = X --
        // eliminación física, no lógica (misma filosofía ya documentada
        // para mascotas: el borrado lógico queda como mejora futura).
        await dueno.destroy();


        registrarActividad(`👤 POST /duenos/id/eliminar - ÉXITO: Dueño #${id} eliminado exitosamente (${req.session.usuario.email}).`);


        res.redirect('/duenos');
    } catch (error) {
        registrarActividad(`❌ POST /duenos/id/eliminar - Error Crítico: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos eliminar el dueño en este momento.',
            error: { status: 500, stack: error.message },
            nombreClinica: 'VetCare Pro'
        });
    }
});


export default router;
