const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { 
    ssl: { 
      require: true, 
      rejectUnauthorized: false 
    } 
  }
});

// MODELO DE FINANZAS - DECLARACIÓN EXPANDIDA DE CAMPOS
const Finanza = db.define('Finanza', {
  cargaId: { 
    type: DataTypes.INTEGER, 
    unique: true 
  },
  v_flete: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  v_facturar: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  est_pago: { 
    type: DataTypes.STRING, 
    defaultValue: 'PENDIENTE' 
  },
  nro_factura: { 
    type: DataTypes.STRING 
  },
  fecha_pago_real: { 
    type: DataTypes.DATEONLY 
  },
  obs_contable: { 
    type: DataTypes.TEXT 
  },
  referencia_soporte: { 
    type: DataTypes.STRING 
  },
  tipo_anticipo: { 
    type: DataTypes.STRING 
  },
  valor_anticipo: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  sobre_anticipo: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  estado_anticipo: { 
    type: DataTypes.STRING 
  },
  fecha_pago_anticipo: { 
    type: DataTypes.DATEONLY 
  },
  tipo_cumplido: { 
    type: DataTypes.STRING 
  },
  fecha_cumplido_virtual: { 
    type: DataTypes.DATEONLY 
  },
  ent_manifiesto: { 
    type: DataTypes.STRING, 
    defaultValue: 'NO' 
  },
  ent_remesa: { 
    type: DataTypes.STRING, 
    defaultValue: 'NO' 
  },
  ent_hoja_tiempos: { 
    type: DataTypes.STRING, 
    defaultValue: 'NO' 
  },
  ent_docs_cliente: { 
    type: DataTypes.STRING, 
    defaultValue: 'NO' 
  },
  ent_facturas: { 
    type: DataTypes.STRING, 
    defaultValue: 'NO' 
  },
  ent_tirilla_vacio: { 
    type: DataTypes.STRING, 
    defaultValue: 'NO' 
  },
  ent_tiquete_cargue: { 
    type: DataTypes.STRING, 
    defaultValue: 'NO' 
  },
  ent_tiquete_descargue: { 
    type: DataTypes.STRING, 
    defaultValue: 'NO' 
  },
  presenta_novedades: { 
    type: DataTypes.STRING, 
    defaultValue: 'NO' 
  },
  obs_novedad: { 
    type: DataTypes.TEXT 
  },
  valor_descuento: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  fecha_cumplido_docs: { 
    type: DataTypes.DATEONLY 
  },
  fecha_legalizacion: { 
    type: DataTypes.DATEONLY 
  },
  retefuente: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  reteica: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  saldo_a_pagar: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  dias_sin_pagar: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0 
  },
  dias_sin_cumplir: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0 
  }
}, { 
  tableName: 'Yego_Finanzas' 
});

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPagar = 0;
    let totalFacturar = 0;

    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      const fleteP = Number(f.v_flete || 0);
      const factuP = Number(f.v_facturar || 0);
      const estP = f.est_pago || "PENDIENTE";

      if(estP === 'PENDIENTE') totalPagar += fleteP;
      totalFacturar += factuP;

      return `
        <tr class="fila-carga" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="padding:10px; border-right:1px solid #334155;">#${c.id}</td>
          <td style="padding:10px; border-right:1px solid #334155;">${c.f_doc || '---'}</td>
          <td style="padding:10px; border-right:1px solid #334155;">${c.cli || '---'}</td>
          <td style="padding:10px; border-right:1px solid #334155; font-weight:bold;">${c.placa}</td>
          <td style="padding:10px; border-right:1px solid #334155; color:#10b981;">$${fleteP.toLocaleString()}</td>
          <td style="padding:10px; border-right:1px solid #334155;">${f.tipo_anticipo || '-'}</td>
          <td style="padding:10px; border-right:1px solid #334155;">$${Number(f.valor_anticipo||0).toLocaleString()}</td>
          <td style="padding:10px; border-right:1px solid #334155;">${f.estado_anticipo || '-'}</td>
          <td style="padding:10px; border-right:1px solid #334155;">${f.fecha_cumplido_virtual || '-'}</td>
          <td style="padding:10px; border-right:1px solid #334155; color:#ef4444;">$${Number(f.valor_descuento||0).toLocaleString()}</td>
          <td style="padding:10px; border-right:1px solid #334155; background:rgba(16,185,129,0.1); color:#10b981; font-weight:bold;">$${Number(f.saldo_a_pagar||0).toLocaleString()}</td>
          <td style="padding:10px; border-right:1px solid #334155;">${f.nro_factura || '---'}</td>
          <td style="padding:10px; border-right:1px solid #334155; color:#ef4444;">${f.dias_sin_pagar || 0}</td>
          <td style="padding:10px; border-right:1px solid #334155; color:#3b82f6;">${f.dias_sin_cumplir || 0}</td>
          <td style="padding:10px; border-right:1px solid #334155;">
            <span style="background:${estP==='PAGADO'?'#065f46':'#7f1d1d'}; padding:4px 8px; border-radius:4px;">${estP}</span>
          </td>
          <td style="padding:10px; text-align:center;">
            <a href="/editar/${c.id}" style="color:#3b82f6; text-decoration:none; font-weight:bold; background:rgba(59,130,246,0.1); padding:5px 10px; border-radius:4px;">GESTIONAR</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; margin:0; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:20px; border-radius:12px; border:1px solid #475569; margin-bottom:20px;">
          <h2 style="margin:0; color:#3b82f6;">SISTEMA CONTABLE YEGO</h2>
          <div style="display:flex; gap:30px;">
            <div style="text-align:right;"><small style="color:#ef4444;">TOTAL PENDIENTE</small><br><b style="font-size:20px;">$${totalPagar.toLocaleString()}</b></div>
            <div style="text-align:right; border-left:1px solid #334155; padding-left:30px;"><small style="color:#3b82f6;">TOTAL FACTURACIÓN</small><br><b style="font-size:20px;">$${totalFacturar.toLocaleString()}</b></div>
          </div>
        </div>
        <div style="overflow-x:auto; border-radius:10px; border:1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; min-width:2800px; background:#1e293b;">
            <thead style="background:#1e40af; text-transform:uppercase; font-size:10px;">
              <tr>
                <th style="padding:15px; border-bottom:2px solid #334155;">ID CARGA</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">FECHA REG</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">CLIENTE</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">PLACA</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">V. FLETE</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">TIPO ANT</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">VALOR ANT</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">ESTADO ANT</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">F. CUMP VIRT</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">DESCUENTOS</th>
                <th style="padding:15px; border-bottom:2px solid #334155; background:#064e3b;">SALDO FINAL</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">N° FACTURA</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">D. MORA PAGO</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">D. MORA CUMP</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">ESTADO</th>
                <th style="padding:15px; border-bottom:2px solid #334155;">ACCIONES</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </body>`);
  } catch (e) { res.send("Error: " + e.message); }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:30px;">
      <div style="max-width:1100px; margin:auto; background:#1e293b; padding:40px; border-radius:20px; border:1px solid #3b82f6;">
        <h2 style="text-align:center; color:#3b82f6; border-bottom:1px solid #334155; padding-bottom:20px;">GESTIÓN MANUAL CARGA #${req.params.id}</h2>
        <form action="/guardar/${req.params.id}" method="POST" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:20px;">
          <div><label>TIPO ANTICIPO</label><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo||''}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569;"></div>
          <div><label>VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569;"></div>
          <div><label>SOBRE ANTICIPO</label><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569;"></div>
          <div><label>ESTADO ANTICIPO</label><input type="text" name="estado_anticipo" value="${f.estado_anticipo||''}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569;"></div>
          <div><label>FECHA PAGO ANT</label><input type="date" name="fecha_pago_anticipo" value="${f.fecha_pago_anticipo||''}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569;"></div>
          <div><label>TIPO CUMPLIDO</label><input type="text" name="tipo_cumplido" value="${f.tipo_cumplido||''}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569;"></div>
          
          <div style="grid-column:span 3; background:#0f172a; padding:20px; border-radius:10px; display:grid; grid-template-columns:repeat(4,1fr); gap:15px; border:1px solid #334155;">
            <p style="grid-column:span 4; color:#3b82f6; margin:0; font-weight:bold;">DOCUMENTOS RECIBIDOS (SI/NO)</p>
            <label>MANIFIESTO <input type="text" name="ent_manifiesto" value="${f.ent_manifiesto}" style="width:100%; background:none; border:1px solid #475569; color:white;"></label>
            <label>REMESA <input type="text" name="ent_remesa" value="${f.ent_remesa}" style="width:100%; background:none; border:1px solid #475569; color:white;"></label>
            <label>TIQ CARGUE <input type="text" name="ent_tiquete_cargue" value="${f.ent_tiquete_cargue}" style="width:100%; background:none; border:1px solid #475569; color:white;"></label>
            <label>TIQ DESCARGUE <input type="text" name="ent_tiquete_descargue" value="${f.ent_tiquete_descargue}" style="width:100%; background:none; border:1px solid #475569; color:white;"></label>
          </div>

          <div><label>VALOR DESCUENTO</label><input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569;"></div>
          <div><label>SALDO FINAL A PAGAR</label><input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" style="width:100%; padding:10px; background:#0f172a; color:#10b981; border:1px solid #10b981; font-weight:bold;"></div>
          <div><label>ESTADO PAGO</label><select name="est_pago" style="width:100%; padding:10px; background:#0f172a; color:white;"><option ${f.est_pago==='PENDIENTE'?'selected':''}>PENDIENTE</option><option ${f.est_pago==='PAGADO'?'selected':''}>PAGADO</option></select></div>
          
          <div><label>DÍAS SIN PAGAR</label><input type="number" name="dias_sin_pagar" value="${f.dias_sin_pagar}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569;"></div>
          <div><label>DÍAS SIN CUMPLIR</label><input type="number" name="dias_sin_cumplir" value="${f.dias_sin_cumplir}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569;"></div>
          <div><label>NRO FACTURA</label><input type="text" name="nro_factura" value="${f.nro_factura||''}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569;"></div>

          <button type="submit" style="grid-column:span 3; padding:20px; background:#3b82f6; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer; font-size:16px;">GUARDAR GESTIÓN COMPLETA</button>
        </form>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT));
