// Importamos express y el enrutador
import express from "express";
const router = express.Router();

// Configuración del enrutador (router) con el metodo HTPP Get (aunque existen Post, Put, Delete)
// RUTA DE INICIO (/)
router.get('/', (req, res, next) => {
  const data = {
    title: "Inicio | VetCare Pro",
    nombreClinica: "VetCare Pro",
    descripcion: "Cuidamos de tus regalones con amor y profesionalismo.",
    heroMessage: "Bienvenido a VetCare Pro, expertos en salud animal, comprometidos con tu mascota.",
  };
  res.render('index', data);
});

// RUTA NUEVA: SERVICIOS (/servicios)
router.get('/servicios', (req, res, next) => {
  const data = {
    title: "Servicios | VetCare Pro",
    nombreClinica: "VetCare Pro",
    descripcion: "Ofrecemos una amplia gama de servicios médicos especializados para asegurar la salud de tus regalones.",
    heroMessage: "Nuestros Servicios",
    listaServicios: [
        "Consulta General y Preventiva",
        "Vacunación e Identificación por Microchip",
        "Cirugía de Alta Complejidad",
        "Laboratorio Clínico y Diagnóstico",
        "Peluquería Estética"
    ]
  };
  res.render('servicios', data);
});

// RUTA NUEVA: CONTACTO (/contacto)
router.get('/contacto', (req, res, next) => {
  const data = {
    title: "Contacto | VetCare Pro",
    nombreClinica: "VetCare Pro",
    descripcion: "¿Tienes alguna duda o necesitas agendar alguna cita? Nuestro equipo está listo para atenderte.",
    heroMessage: "Ponte en Contacto",
    infoContacto: {
      telefono: "+569 99445522",
      email: "contacto@vetcarepro.cl",
      direccion: "Alameda 123, Santiago, Chile"
    }
  };
  res.render('contacto', data);
});

// RUTA NUEVA: Configurar el POST

export default router;