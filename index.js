const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// FUNCIÓN DINÁMICA: Busca un valor sin importar si la columna es f_doc, F_DOC, F_Doc, etc.
const encontrarValor = (objeto, nombreDeseado) => {
  if (!objeto) return null;
  const llaveEncontrada = Object.keys(objeto).find(
    k => k.toLowerCase().replace(/_/g, '') === nombreDeseado.toLowerCase().replace(/_/g, '')
  );
  return llaveEncontrada ? objeto[llaveEncontrada] : null;
};

app.get('/', async (req, res) => {
  try {
    // Consulta limpia para ver qué nos devuelve la base de datos realmente
    const sql = `
      SELECT c.*, f.*, c.id AS id_principal
      FROM "Cargas" c
      LEFT JOIN "Yego_Finanzas" f ON CAST(c.id AS TEXT) = CAST(f."cargaId" AS TEXT)
      WHERE c.placa IS NOT NULL AND c.placa != '' 
      ORDER BY c.id DESC LIMIT 100`;
    
    const datos = await db.query(sql, { type: QueryTypes.SELECT });

    // DIAGNÓSTICO VISUAL: Esto te dirá qué columnas existen de verdad
    let columnasDetectadas = "";
    if (datos.length > 0) {
      columnasDetectadas = Object.keys(datos[0]).map(k => `<span style="background:#334155; padding:2px 6px; border-radius:4px; margin:2px; display:inline-block; font-size:10px;">${k}</span>`).join(' ');
    }

    let filas = datos.map(c => {
      // Intentamos extraer los datos "buscando" nombres similares
      const id = c.id_principal || c.id;
      const fecha = encontrarValor(c, 'fdoc') || encontrarValor(c, 'fecha') || encontrarValor(c, 'createdat') || '---';
      const fleteP = parseFloat(encontrarValor(c, 'vflete') || 0);
      const fleteF = parseFloat(encontrarValor(c, 'vfacturar') || 0);
      const saldo = parseFloat(encontrarValor(c, 'saldoapagar') || 0);
      const placa = encontrarValor(c, 'placa') || 'SIN PLACA';

      const tdStyle = `padding: 10px; text-align: center; border-bottom: 1px solid #334155;`;

      return `
        <tr style="font-size: 12px;">
          <td style="${tdStyle} color:#94a3b8;">#${id}</td>
          <td style="${tdStyle}">${fecha}</td>
          <td style="${tdStyle} font-weight:bold; color:#3b82f6;">${placa}</td>
          <td style="${tdStyle} color:#10b981;">$${fleteP.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color:#3b82f6;">$${fleteF.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} background:rgba(16,185,129,0.1); font-weight:bold;">$${saldo.toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">
            <a href="/editar/${id}" style="color:#3b82f6; text-decoration:none;">[EDITAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
        <div style="background:#1e293b; padding:20px; border-radius:10px; border:1px solid #3b82f6; margin-bottom:20px;">
          <h2 style="margin:0 0 10px 0; color:#3b82f6;">PANEL DE CONTROL YEGO</h2>
          <p style="font-size:12px; color:#94a3b8;"><b>Columnas detectadas en tu DB:</b><br>${columnasDetectadas}</p>
        </div>

        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; overflow:hidden;">
          <thead style="background:#3b82f6; color:white;">
            <tr>
              <th style="padding:12px;">ID</th>
              <th style="padding:12px;">FECHA REGISTRO</th>
              <th style="padding:12px;">PLACA</th>
              <th style="padding:12px;">FLETE PAGAR</th>
              <th style="padding:12px;">FLETE FACTURAR</th>
              <th style="padding:12px;">SALDO FINAL</th>
              <th style="padding:12px;">ACCIÓN</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>
    `);
  } catch (err) {
    res.status(500).send(`<h1 style="color:red;">Error: ${err.message}</h1>`);
  }
});

// RUTA PARA GUARDAR (Ajustada a lo que vimos en tus errores anteriores)
app.post('/guardar/:id', async (req, res) => {
    try {
        const query = `
            INSERT INTO "Yego_Finanzas" ("cargaId", v_flete, v_facturar, saldo_a_pagar)
            VALUES (:id, :flete, :facturar, :saldo)
            ON CONFLICT ("cargaId") 
            DO UPDATE SET v_flete = EXCLUDED.v_flete, v_facturar = EXCLUDED.v_facturar, saldo_a_pagar = EXCLUDED.saldo_a_pagar`;
        
        await db.query(query, {
            replacements: { 
                id: req.params.id, 
                flete: req.body.v_flete || 0, 
                facturar: req.body.v_facturar || 0, 
                saldo: req.body.saldo_a_pagar || 0 
            },
            type: QueryTypes.INSERT
        });
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Error al guardar: " + err.message);
    }
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Diagnóstico en marcha'));
