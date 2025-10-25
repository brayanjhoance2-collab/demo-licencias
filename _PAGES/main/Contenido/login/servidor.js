"use server"
import db from "@/_DB/db"
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_cambiarla'

export async function iniciarSesion(email, password) {
    try {
        if (!email || !password) {
            return {
                success: false,
                mensaje: 'Email y contraseña son requeridos'
            }
        }

        // Primero buscar en administradores
        const [admin] = await db.query(`
            SELECT 
                id_admin as id,
                nombre_completo,
                email,
                password_hash,
                activo
            FROM administradores
            WHERE email = ? AND activo = 1
        `, [email])

        if (admin.length > 0) {
            const adminData = admin[0]
            
            // Verificar contraseña
            const passwordValido = await bcrypt.compare(password, adminData.password_hash)
            
            if (!passwordValido) {
                return {
                    success: false,
                    mensaje: 'Credenciales incorrectas'
                }
            }

            // Actualizar ultima sesion
            await db.query(`
                UPDATE administradores 
                SET ultima_sesion = CURRENT_TIMESTAMP 
                WHERE id_admin = ?
            `, [adminData.id])

            // Registrar en historial
            await db.query(`
                INSERT INTO historial_administradores (id_admin, accion, detalles)
                VALUES (?, 'LOGIN', 'Inicio de sesion exitoso')
            `, [adminData.id])

            // Crear token JWT
            const token = jwt.sign(
                {
                    id: adminData.id,
                    email: adminData.email,
                    tipo: 'administrador'
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            )

            // Guardar token en cookie
            const cookieStore = await cookies()
            cookieStore.set('auth_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7
            })

            return {
                success: true,
                rol: 'administrador',
                mensaje: 'Inicio de sesion exitoso',
                usuario: {
                    id: adminData.id,
                    nombre: adminData.nombre_completo,
                    email: adminData.email
                }
            }
        }

        // Si no es admin, buscar en usuarios
        const [usuario] = await db.query(`
            SELECT 
                u.id_usuario as id,
                u.nombre_completo,
                u.email,
                u.password_hash,
                u.activo,
                l.id_licencia,
                l.activa as licencia_activa,
                l.fecha_vencimiento
            FROM usuarios u
            LEFT JOIN licencias l ON u.id_usuario = l.id_usuario
            WHERE u.email = ? AND u.activo = 1
        `, [email])

        if (usuario.length === 0) {
            return {
                success: false,
                mensaje: 'Credenciales incorrectas'
            }
        }

        const usuarioData = usuario[0]

        // Verificar contraseña
        const passwordValido = await bcrypt.compare(password, usuarioData.password_hash)
        
        if (!passwordValido) {
            return {
                success: false,
                mensaje: 'Credenciales incorrectas'
            }
        }

        // Verificar si tiene licencia activa
        if (!usuarioData.id_licencia || !usuarioData.licencia_activa) {
            return {
                success: false,
                mensaje: 'Tu licencia no esta activa. Contacta al administrador por WhatsApp'
            }
        }

        // Verificar si la licencia no esta vencida
        const fechaVencimiento = new Date(usuarioData.fecha_vencimiento)
        const fechaActual = new Date()
        
        if (fechaVencimiento < fechaActual) {
            return {
                success: false,
                mensaje: 'Tu licencia ha vencido. Contacta al administrador por WhatsApp'
            }
        }

        // Actualizar ultima sesion
        await db.query(`
            UPDATE usuarios 
            SET ultima_sesion = CURRENT_TIMESTAMP 
            WHERE id_usuario = ?
        `, [usuarioData.id])

        // Crear token JWT
        const token = jwt.sign(
            {
                id: usuarioData.id,
                email: usuarioData.email,
                tipo: 'usuario'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        )

        // Guardar token en cookie
        const cookieStore = await cookies()
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
        })

        return {
            success: true,
            rol: 'usuario',
            mensaje: 'Inicio de sesion exitoso',
            usuario: {
                id: usuarioData.id,
                nombre: usuarioData.nombre_completo,
                email: usuarioData.email,
                fechaVencimiento: usuarioData.fecha_vencimiento
            }
        }

    } catch (error) {
        console.log('Error al iniciar sesion:', error)
        return {
            success: false,
            mensaje: 'Error al procesar la solicitud',
            error: error.message
        }
    }
}

export async function obtenerTelefonoEmpresa() {
    try {
        const [empresa] = await db.query(`
            SELECT telefono_principal
            FROM datos_empresa
            WHERE activo = 1
            LIMIT 1
        `)

        if (empresa.length > 0 && empresa[0].telefono_principal) {
            return empresa[0].telefono_principal.replace(/[^0-9]/g, '')
        }

        return null
    } catch (error) {
        console.log('Error al obtener telefono de empresa:', error)
        return null
    }
}

export async function cerrarSesion() {
    try {
        const cookieStore = await cookies()
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