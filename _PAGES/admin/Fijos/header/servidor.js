"use server"
import db from "@/_DB/db"
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_cambiarla'

export async function verificarSesionAdmin() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')

        if (!token || !token.value) {
            return {
                success: false,
                esAdmin: false,
                mensaje: 'No hay sesion activa'
            }
        }

        let decoded
        try {
            decoded = jwt.verify(token.value, JWT_SECRET)
        } catch (error) {
            console.log('Token invalido:', error.message)
            return {
                success: false,
                esAdmin: false,
                mensaje: 'Token invalido o expirado'
            }
        }

        if (decoded.tipo !== 'administrador') {
            return {
                success: false,
                esAdmin: false,
                mensaje: 'Acceso denegado - No eres administrador'
            }
        }

        const [admin] = await db.query(`
            SELECT 
                id_admin,
                nombre_completo,
                email,
                telefono,
                activo,
                ultima_sesion
            FROM administradores
            WHERE id_admin = ? AND activo = 1
        `, [decoded.id])

        if (admin.length === 0) {
            return {
                success: false,
                esAdmin: false,
                mensaje: 'Administrador no encontrado o inactivo'
            }
        }

        await db.query(`
            UPDATE administradores 
            SET ultima_sesion = CURRENT_TIMESTAMP 
            WHERE id_admin = ?
        `, [decoded.id])

        return {
            success: true,
            esAdmin: true,
            admin: {
                id: admin[0].id_admin,
                nombre: admin[0].nombre_completo,
                email: admin[0].email,
                telefono: admin[0].telefono,
                ultimaSesion: admin[0].ultima_sesion
            }
        }

    } catch (error) {
        console.log('Error al verificar sesion admin:', error)
        return {
            success: false,
            esAdmin: false,
            mensaje: 'Error al verificar sesion',
            error: error.message
        }
    }
}

export async function cerrarSesionAdmin() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')

        if (token && token.value) {
            try {
                const decoded = jwt.verify(token.value, JWT_SECRET)
                
                if (decoded.tipo === 'administrador') {
                    await db.query(`
                        INSERT INTO historial_administradores (id_admin, accion, detalles)
                        VALUES (?, 'LOGOUT', 'Cierre de sesion')
                    `, [decoded.id])
                }
            } catch (error) {
                console.log('Error al registrar logout:', error)
            }
        }

        cookieStore.delete('auth_token')

        return {
            success: true,
            mensaje: 'Sesion cerrada exitosamente'
        }
    } catch (error) {
        console.log('Error al cerrar sesion:', error)
        return {
            success: false,
            mensaje: 'Error al cerrar sesion',
            error: error.message
        }
    }
}

export async function obtenerEstadisticasHeader() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')

        if (!token || !token.value) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const decoded = jwt.verify(token.value, JWT_SECRET)

        if (decoded.tipo !== 'administrador') {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [notificacionesPendientes] = await db.query(`
            SELECT COUNT(*) as total
            FROM notificaciones
            WHERE tipo_destinatario = 'administrador' 
            AND id_destinatario = ? 
            AND leida = 0
        `, [decoded.id])

        const [usuariosActivos] = await db.query(`
            SELECT COUNT(*) as total
            FROM usuarios
            WHERE activo = 1
        `)

        const [licenciasActivas] = await db.query(`
            SELECT COUNT(*) as total
            FROM licencias
            WHERE activa = 1
        `)

        const [licenciasPorVencer] = await db.query(`
            SELECT COUNT(*) as total
            FROM licencias
            WHERE activa = 1 
            AND DATEDIFF(fecha_vencimiento, CURDATE()) <= 7
            AND DATEDIFF(fecha_vencimiento, CURDATE()) > 0
        `)

        return {
            success: true,
            estadisticas: {
                notificacionesPendientes: notificacionesPendientes[0].total,
                usuariosActivos: usuariosActivos[0].total,
                licenciasActivas: licenciasActivas[0].total,
                licenciasPorVencer: licenciasPorVencer[0].total
            }
        }

    } catch (error) {
        console.log('Error al obtener estadisticas:', error)
        return {
            success: false,
            mensaje: 'Error al obtener estadisticas',
            error: error.message
        }
    }
}

export async function obtenerNotificacionesRecientes() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')

        if (!token || !token.value) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const decoded = jwt.verify(token.value, JWT_SECRET)

        if (decoded.tipo !== 'administrador') {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [notificaciones] = await db.query(`
            SELECT 
                id_notificacion,
                titulo,
                mensaje,
                tipo,
                leida,
                fecha_creacion
            FROM notificaciones
            WHERE tipo_destinatario = 'administrador'
            AND id_destinatario = ?
            ORDER BY fecha_creacion DESC
            LIMIT 10
        `, [decoded.id])

        return {
            success: true,
            notificaciones: notificaciones.map(n => ({
                id: n.id_notificacion,
                titulo: n.titulo,
                mensaje: n.mensaje,
                tipo: n.tipo,
                leida: n.leida === 1,
                fecha: n.fecha_creacion
            }))
        }

    } catch (error) {
        console.log('Error al obtener notificaciones:', error)
        return {
            success: false,
            mensaje: 'Error al obtener notificaciones',
            error: error.message
        }
    }
}

export async function marcarNotificacionComoLeida(idNotificacion) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')

        if (!token || !token.value) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const decoded = jwt.verify(token.value, JWT_SECRET)

        if (decoded.tipo !== 'administrador') {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        await db.query(`
            UPDATE notificaciones
            SET leida = 1, fecha_lectura = CURRENT_TIMESTAMP
            WHERE id_notificacion = ?
            AND tipo_destinatario = 'administrador'
            AND id_destinatario = ?
        `, [idNotificacion, decoded.id])

        return {
            success: true,
            mensaje: 'Notificacion marcada como leida'
        }

    } catch (error) {
        console.log('Error al marcar notificacion:', error)
        return {
            success: false,
            mensaje: 'Error al marcar notificacion',
            error: error.message
        }
    }
}