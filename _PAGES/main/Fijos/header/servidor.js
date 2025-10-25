"use server"
import db from "@/_DB/db"
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_cambiarla'

export async function verificarSesion() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')

        if (!token || !token.value) {
            return {
                sesionActiva: false,
                mensaje: 'No hay sesion activa'
            }
        }

        // Verificar token
        let decoded
        try {
            decoded = jwt.verify(token.value, JWT_SECRET)
        } catch (error) {
            console.log('Token invalido:', error.message)
            return {
                sesionActiva: false,
                mensaje: 'Token invalido o expirado'
            }
        }

        // Verificar si es administrador
        if (decoded.tipo === 'administrador') {
            const [admin] = await db.query(`
                SELECT 
                    id_admin,
                    nombre_completo,
                    email,
                    activo
                FROM administradores
                WHERE id_admin = ? AND activo = 1
            `, [decoded.id])

            if (admin.length === 0) {
                return {
                    sesionActiva: false,
                    mensaje: 'Administrador no encontrado o inactivo'
                }
            }

            // Actualizar ultima sesion
            await db.query(`
                UPDATE administradores 
                SET ultima_sesion = CURRENT_TIMESTAMP 
                WHERE id_admin = ?
            `, [decoded.id])

            return {
                sesionActiva: true,
                rol: 'administrador',
                usuario: {
                    id: admin[0].id_admin,
                    nombre: admin[0].nombre_completo,
                    email: admin[0].email
                }
            }
        }

        // Verificar si es usuario
        if (decoded.tipo === 'usuario') {
            const [usuario] = await db.query(`
                SELECT 
                    u.id_usuario,
                    u.nombre_completo,
                    u.email,
                    u.activo,
                    l.id_licencia,
                    l.activa AS licencia_activa,
                    l.fecha_vencimiento
                FROM usuarios u
                LEFT JOIN licencias l ON u.id_usuario = l.id_usuario
                WHERE u.id_usuario = ? AND u.activo = 1
            `, [decoded.id])

            if (usuario.length === 0) {
                return {
                    sesionActiva: false,
                    mensaje: 'Usuario no encontrado o inactivo'
                }
            }

            // Actualizar ultima sesion
            await db.query(`
                UPDATE usuarios 
                SET ultima_sesion = CURRENT_TIMESTAMP 
                WHERE id_usuario = ?
            `, [decoded.id])

            return {
                sesionActiva: true,
                rol: 'usuario',
                usuario: {
                    id: usuario[0].id_usuario,
                    nombre: usuario[0].nombre_completo,
                    email: usuario[0].email,
                    tieneLicencia: usuario[0].id_licencia ? true : false,
                    licenciaActiva: usuario[0].licencia_activa || false,
                    fechaVencimiento: usuario[0].fecha_vencimiento
                }
            }
        }

        return {
            sesionActiva: false,
            mensaje: 'Tipo de usuario no reconocido'
        }

    } catch (error) {
        console.log('Error al verificar sesion:', error)
        return {
            sesionActiva: false,
            mensaje: 'Error al verificar sesion',
            error: error.message
        }
    }
}

export async function obtenerConfiguracionPublica() {
    try {
        // Obtener datos de la empresa
        const [empresa] = await db.query(`
            SELECT 
                nombre_empresa,
                telefono_principal,
                telefono_secundario,
                email_contacto,
                sitio_web
            FROM datos_empresa
            WHERE activo = 1
            LIMIT 1
        `)

        // Obtener algunas configuraciones publicas
        const [configs] = await db.query(`
            SELECT clave, valor
            FROM configuracion_sistema
            WHERE clave IN ('version_app', 'permitir_registro_usuarios')
        `)

        const configuraciones = {}
        configs.forEach(config => {
            configuraciones[config.clave] = config.valor
        })

        return {
            success: true,
            empresa: empresa.length > 0 ? empresa[0] : null,
            configuraciones
        }

    } catch (error) {
        console.log('Error al obtener configuracion publica:', error)
        return {
            success: false,
            error: error.message
        }
    }
}