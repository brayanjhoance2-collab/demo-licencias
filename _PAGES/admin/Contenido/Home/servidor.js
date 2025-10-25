"use server"
import db from "@/_DB/db"
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_cambiarla'

async function verificarAdmin() {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')

    if (!token || !token.value) {
        return null
    }

    try {
        const decoded = jwt.verify(token.value, JWT_SECRET)
        if (decoded.tipo !== 'administrador') {
            return null
        }
        return decoded
    } catch (error) {
        console.log('Error al verificar token:', error)
        return null
    }
}

export async function obtenerEstadisticasDashboard() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [totalUsuarios] = await db.query(`
            SELECT COUNT(*) as total
            FROM usuarios
            WHERE activo = 1
        `)

        const [licenciasActivas] = await db.query(`
            SELECT COUNT(*) as total
            FROM licencias
            WHERE activa = 1
            AND fecha_vencimiento >= CURDATE()
        `)

        const [licenciasPorVencer] = await db.query(`
            SELECT COUNT(*) as total
            FROM licencias
            WHERE activa = 1
            AND DATEDIFF(fecha_vencimiento, CURDATE()) <= 7
            AND DATEDIFF(fecha_vencimiento, CURDATE()) >= 0
        `)

        const [licenciasVencidas] = await db.query(`
            SELECT COUNT(*) as total
            FROM licencias
            WHERE fecha_vencimiento < CURDATE()
        `)

        return {
            success: true,
            estadisticas: {
                totalUsuarios: totalUsuarios[0].total,
                licenciasActivas: licenciasActivas[0].total,
                licenciasPorVencer: licenciasPorVencer[0].total,
                licenciasVencidas: licenciasVencidas[0].total
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

export async function obtenerLicenciasRecientes() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [licencias] = await db.query(`
            SELECT 
                l.id_licencia,
                l.codigo_licencia,
                l.tipo_licencia,
                l.fecha_vencimiento,
                l.activa,
                l.fecha_creacion,
                DATEDIFF(l.fecha_vencimiento, CURDATE()) as dias_restantes,
                u.id_usuario,
                u.nombre_completo,
                u.email
            FROM licencias l
            INNER JOIN usuarios u ON l.id_usuario = u.id_usuario
            ORDER BY l.fecha_creacion DESC
            LIMIT 10
        `)

        return {
            success: true,
            licencias: licencias.map(l => ({
                id: l.id_licencia,
                codigo: l.codigo_licencia,
                tipo: l.tipo_licencia,
                fechaVencimiento: l.fecha_vencimiento,
                activa: l.activa === 1,
                diasRestantes: l.dias_restantes,
                idUsuario: l.id_usuario,
                nombreUsuario: l.nombre_completo,
                emailUsuario: l.email
            }))
        }

    } catch (error) {
        console.log('Error al obtener licencias recientes:', error)
        return {
            success: false,
            mensaje: 'Error al obtener licencias',
            error: error.message
        }
    }
}

export async function obtenerUsuariosRecientes() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [usuarios] = await db.query(`
            SELECT 
                u.id_usuario,
                u.nombre_completo,
                u.email,
                u.telefono,
                u.fecha_registro,
                u.activo,
                COUNT(l.id_licencia) as total_licencias,
                MAX(l.activa) as tiene_licencia_activa
            FROM usuarios u
            LEFT JOIN licencias l ON u.id_usuario = l.id_usuario
            WHERE u.activo = 1
            GROUP BY u.id_usuario
            ORDER BY u.fecha_registro DESC
            LIMIT 10
        `)

        return {
            success: true,
            usuarios: usuarios.map(u => ({
                id: u.id_usuario,
                nombre: u.nombre_completo,
                email: u.email,
                telefono: u.telefono,
                fechaRegistro: u.fecha_registro,
                tieneLicencia: u.total_licencias > 0,
                licenciaActiva: u.tiene_licencia_activa === 1
            }))
        }

    } catch (error) {
        console.log('Error al obtener usuarios recientes:', error)
        return {
            success: false,
            mensaje: 'Error al obtener usuarios',
            error: error.message
        }
    }
}

export async function obtenerResumenGeneral() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [usuariosHoy] = await db.query(`
            SELECT COUNT(*) as total
            FROM usuarios
            WHERE DATE(fecha_registro) = CURDATE()
        `)

        const [licenciasHoy] = await db.query(`
            SELECT COUNT(*) as total
            FROM licencias
            WHERE DATE(fecha_creacion) = CURDATE()
        `)

        const [ingresosMensuales] = await db.query(`
            SELECT COUNT(*) as total
            FROM licencias
            WHERE MONTH(fecha_creacion) = MONTH(CURDATE())
            AND YEAR(fecha_creacion) = YEAR(CURDATE())
        `)

        const [notificacionesPendientes] = await db.query(`
            SELECT COUNT(*) as total
            FROM notificaciones
            WHERE tipo_destinatario = 'administrador'
            AND leida = 0
        `)

        return {
            success: true,
            resumen: {
                usuariosHoy: usuariosHoy[0].total,
                licenciasHoy: licenciasHoy[0].total,
                licenciasMes: ingresosMensuales[0].total,
                notificacionesPendientes: notificacionesPendientes[0].total
            }
        }

    } catch (error) {
        console.log('Error al obtener resumen general:', error)
        return {
            success: false,
            mensaje: 'Error al obtener resumen',
            error: error.message
        }
    }
}