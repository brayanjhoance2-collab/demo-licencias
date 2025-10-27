import { NextResponse } from 'next/server'
import db from '@/_DB/db'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS(request) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request) {
  try {
    const connection = await db.getConnection()

    try {
      const [empresas] = await connection.execute(
        `SELECT 
          nombre_empresa,
          razon_social,
          direccion,
          telefono_principal,
          telefono_secundario,
          email_contacto,
          sitio_web
         FROM datos_empresa 
         WHERE activo = TRUE 
         LIMIT 1`
      )

      if (empresas.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No se encontró información de la empresa'
        }, { status: 404, headers: corsHeaders })
      }

      return NextResponse.json({
        success: true,
        data: empresas[0]
      }, { headers: corsHeaders })

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('Error al obtener info de empresa:', error)
    return NextResponse.json({
      success: false,
      error: 'Error del servidor'
    }, { status: 500, headers: corsHeaders })
  }
}