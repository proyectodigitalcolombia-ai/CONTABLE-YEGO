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

// --- MODELO YEGO_FINANZAS CON TODOS LOS CAMPOS ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_ant: { type: DataTypes.STRING },
  fecha_pago_ant: { type: DataTypes.DATEONLY },
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cump_virtual: { type: DataTypes.DATEONLY },
  ent_manifiesto: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_remesa: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_hoja_tiempos: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_docs_cliente: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_facturas: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tirilla_vacio: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tiq_cargue: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tiq_descargue: { type: DataTypes.STRING, defaultValue: 'NO' },
  presenta_novedades: { type: DataTypes.STRING, defaultValue: 'NO' },
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  fecha_cump_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_final: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  dias_sin_pagar: { type: DataTypes.INTEGER, defaultValue: 0 },
  dias_sin_cumplir: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'Yego_Finanzas' });

// --- API PARA ACTUALIZACIÓN DESDE EL GRID ---
app.post('/api/update-cell', async (req, res) => {
  try {
    const { cargaId, campo, valor } = req.body;
    const [registro] = await Finanza.findOrCreate({ where: { cargaId } });
    
    let v_final = valor.replace(/[$\s,]/g, ''); 
    const numericos = ['valor_anticipo', 'sobre_anticipo', 'valor_descuento', 'retefuente', 'reteica', 'saldo_a_pagar', 'dias_sin_pagar', 'dias_sin_cumplir'];
    
    if (numericos.includes(campo)) {
      v_final = parseFloat(v_final) || 0;
    } else {
      v_final = v_final.toUpperCase().trim();
    }

    await registro.update({ [campo]: v_final });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- VISTA PRINCIPAL (EL GRID TIPO EXCEL) ---
app.get('/', async (req, res) => {
  try {
    // CONSULTA CON NOMBRES EXACTOS PARA EVITAR EL 0
    const sql = `SELECT *, "V_FLETE" AS f_pagar, "V_FACTURAR" AS f_facturar FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();
    let sumatoriaPendiente = 0;

    const filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      const fleteLogis = Number(c.f_pagar || 0);
      const facturarLogis = Number(c.f_facturar || 0);
      
      if((f.est_pago || 'PENDIENTE') === 'PENDIENTE') sumatoriaPendiente += fleteLogis;

      const tdEstilo = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap; outline: none; transition: 0.3s;`;
      
      const celdaEditable = (campo, valor, extra = "") => `
        <td class="edit-cell" contenteditable="true" data-id="${c.id}" data-campo="${campo}" 
            style="${tdEstilo} ${extra} background: rgba(255,255,255,0.02); cursor: cell;">
          ${valor || ''}
        </td>`;

      return `
        <tr class="fila" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdEstilo} color: #94a3b8;">#${c.id}</td>
          <td style="${tdEstilo}">${c.f_doc || ''}</td>
          <td style="${tdEstilo}">${c.oficina || ''}</td>
          <td style="${tdEstilo}">${c.orig || ''}</td>
          <td style="${tdEstilo}">${c.dest || ''}</td>
          <td style="${tdEstilo}">${c.cli || ''}</td>
          <td style="${tdEstilo}">${c.cont || ''}</td>
          <td style="${tdEstilo}">${c.ped || ''}</td>
          <td style="${tdEstilo} font-weight: bold; color: #60a5fa;">${c.placa}</td>
          <td style="${tdEstilo}">${c.muc || ''}</td>
          
          <td style="${tdEstilo} color: #10b981; font-weight: bold; background: rgba(16, 185, 129, 0.05);">$${fleteLogis.toLocaleString('es-CO')}</td>
          <td style="${tdEstilo} color: #3b82f6; font-weight: bold; background: rgba(59, 130, 246, 0.05);">$${facturarLogis.toLocaleString('es-CO')}</td>
          
          <td style="${tdEstilo}">${c.f_act || ''}</td>
          <td style="${tdEstilo} color: #fbbf24;">${c.est_real || ''}</td>
          
          ${celdaEditable('tipo_anticipo', f.tipo_anticipo)}
          ${celdaEditable('valor_anticipo', f.valor_anticipo)}
          ${celdaEditable('sobre_anticipo', f.sobre_anticipo)}
          ${celdaEditable('estado_ant', f.estado_ant)}
          ${celdaEditable('fecha_pago_ant', f.fecha_pago_ant)}
          ${celdaEditable('tipo_cumplido', f.tipo_cumplido)}
          ${celdaEditable('fecha_cump_virtual', f.fecha_cump_virtual)}
          
          ${celdaEditable('ent_manifiesto', f.ent_manifiesto)}
          ${celdaEditable('ent_remesa', f.ent_remesa)}
          ${celdaEditable('ent_hoja_tiempos', f.ent_hoja_tiempos)}
          ${celdaEditable('ent_docs_cliente', f.ent_docs_cliente)}
          ${celdaEditable('ent_facturas', f.ent_facturas)}
          ${celdaEditable('ent_tirilla_vacio', f.ent_tirilla_vacio)}
          ${celdaEditable('ent_tiq_cargue', f.ent_tiq_cargue)}
          ${celdaEditable('ent_tiq_descargue', f.ent_tiq_descargue)}
          ${celdaEditable('presenta_novedades', f.presenta_novedades)}
          
          ${celdaEditable('obs_novedad', f.obs_novedad, "min-width: 180px; text-align: left;")}
          ${celdaEditable('valor_descuento', f.valor_descuento, "color: #ef4444;")}
          ${celdaEditable('fecha_cump_docs', f.fecha_cump_docs)}
          ${celdaEditable('fecha_legalizacion', f.fecha_legalizacion)}
          ${celdaEditable('retefuente', f.retefuente)}
          ${celdaEditable('reteica', f.reteica)}
          ${celdaEditable('saldo_a_pagar', f.saldo_a_pagar, "background: rgba(16,185,129,0.1); color: #10b981; font-weight: bold;")}
          ${celdaEditable('estado_final', f.estado_final)}
          ${celdaEditable('dias_sin_pagar', f.dias_sin_pagar, "color: #ef4444;")}
          ${celdaEditable('dias_sin_cumplir', f.dias_sin_cumplir, "color: #3b82f6;")}
          
          <td style="padding: 10px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold; border: 1px solid #3b82f6; padding: 4px 8px; border-radius: 4px;">ABRIR</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; margin:0; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:20px; border-radius:12px; border:1px solid #334155; margin-bottom:20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <h2 style="margin:0; color:#3b82f6; letter-spacing: 1px;">SISTEMA DE CONTROL FINANCIERO YEGO</h2>
          <div style="text-align:right;">
            <span style="color:#94a3b8; font-size: 12px;">TOTAL PENDIENTE POR PAGAR</span><br>
            <b style="font-size:26px; color:#10b981;">$ ${sumatoriaPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Escribe una placa para filtrar resultados inmediatamente..." style="width:100%; padding:15px; background:#1e293b; color:white; border:1px solid #334155; border-radius:10px; margin-bottom:20px; outline:none; font-size: 16px;">

        <div style="overflow-x:auto; border:1px solid #334155; border-radius:12px; background: #1e293b;">
          <table style="width:100%; border-collapse:collapse; min-width:7000px;">
            <thead style="background:#1e40af; color:white; font-size:11px; text-transform:uppercase; letter-spacing: 0.5px;">
              <tr>
                <th style="padding:18px;">ID</th><th>FECHA REGISTRO</th><th>OFICINA</th><th>ORIGEN</th><th>DESTINO</th><th>CLIENTE</th><th>CONTENEDOR</th><th>PEDIDO</th><th>PLACA</th><th>MUC</th>
                <th style="background:#064e3b; border-bottom: 4px solid #10b981;">VALOR FLETE A PAGAR (LOGIS)</th><th style="background:#1e3a8a; border-bottom: 4px solid #3b82f6;">VALOR FLETE A FACTURAR (LOGIS)</th>
                <th>FECHA ACT.</th><th>ESTADO LOGIS</th>
                <th>TIPO ANTICIPO</th><th>VALOR ANTICIPO</th><th>SOBRE ANTICIPO</th><th>ESTADO ANTICIPO</th><th>FECHA PAGO ANT.</th><th>TIPO CUMPLIDO</th><th>CUMPLIDO VIRTUAL</th>
                <th>MANIFIESTO</th><th>REMESA</th><th>HOJA TIEMPOS</th><th>DOCS CLIENTE</th><th>FACTURAS</th><th>TIRILLA VACÍO</th><th>TIQ. CARGUE</th><th>TIQ. DESCARGUE</th><th>NOVEDADES</th>
                <th>OBS. NOVEDAD</th><th>DESCUENTO</th><th>FECHA DOCS</th><th>LEGALIZACIÓN</th><th>RETEFUENTE</th><th>RETEICA</th><th>SALDO A PAGAR</th><th>ESTADO FINAL</th><th>DÍAS MORA</th><th>DÍAS CUMP.</th><th style="background:#0f172a;">ACCIONES</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>

        <script>
          const input = document.getElementById('buscador');
          input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            document.querySelectorAll('.fila').forEach(tr => {
              tr.style.display = tr.getAttribute('data-placa').includes(val) ? '' : 'none';
            });
          });

          document.querySelectorAll('.edit-cell').forEach(cell => {
            cell.addEventListener('blur', async function() {
              const id = this.getAttribute('data-id');
              const campo = this.getAttribute('data-campo');
              const valor = this.innerText.trim();
              
              this.style.background = 'rgba(59, 130, 246, 0.3)';
              
              try {
                const r = await fetch('/api/update-cell', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ cargaId: id, campo, valor })
                });
                if(r.ok) {
                  this.style.background = 'rgba(16, 185, 129, 0.3)';
                  setTimeout(() => this.style.background = 'rgba(255,255,255,0.02)', 1000);
                }
              } catch (err) {
                this.style.background = 'rgba(239, 68, 68, 0.4)';
              }
            });
            cell.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); cell.blur(); } });
          });
        </script>
        <style>
          .edit-cell:focus { background: #0f172a !important; border: 2px solid #3b82f6 !important; border-radius: 4px; z-index: 10; position: relative; }
          .edit-cell:hover { background: rgba(59, 130, 246, 0.1) !important; transition: 0.3s; }
          ::-webkit-scrollbar { height: 12px; width: 12px; }
          ::-webkit-scrollbar-track { background: #0f172a; }
          ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; border: 3px solid #0f172a; }
          ::-webkit-scrollbar-thumb:hover { background: #475569; }
        </style>
      </body>`);
  } catch (err) { res.status(500).send("ERROR DE SISTEMA: " + err.message); }
});

// --- RUTA DE FORMULARIO DE EDICIÓN DETALLADA ---
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:white; font-family:sans-serif; padding:50px;">
      <div style="max-width:900px; margin:auto; background:#1e293b; padding:40px; border-radius:20px; border:1px solid #3b82f6; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
        <h2 style="color:#3b82f6; text-align:center; margin-bottom: 30px; font-size: 28px;">DETALLE DE LIQUIDACIÓN - CARGA #${req.params.id}</h2>
        <form action="/guardar/${req.params.id}" method="POST" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px;">
           <div style="grid-column: span 1;"><label style="display:block; color:#94a3b8; margin-bottom:5px;">TIPO ANTICIPO</label><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo||''}" style="width:100%; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;"></div>
           <div><label style="display:block; color:#94a3b8; margin-bottom:5px;">VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;"></div>
           <div><label style="display:block; color:#94a3b8; margin-bottom:5px;">SOBRE ANTICIPO</label><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;"></div>
           <div><label style="display:block; color:#94a3b8; margin-bottom:5px;">ESTADO ANTICIPO</label><input type="text" name="estado_ant" value="${f.estado_ant||''}" style="width:100%; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;"></div>
           <div style="grid-column: span 2;"><label style="display:block; color:#94a3b8; margin-bottom:5px;">OBSERVACIONES DE NOVEDAD</label><textarea name="obs_novedad" style="width:100%; height:45px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px; padding:10px;">${f.obs_novedad||''}</textarea></div>
           <div><label style="display:block; color:#94a3b8; margin-bottom:5px;">RETEFUENTE</label><input type="number" step="0.01" name="retefuente" value="${f.retefuente}" style="width:100%; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;"></div>
           <div><label style="display:block; color:#94a3b8; margin-bottom:5px;">RETEICA</label><input type="number" step="0.01" name="reteica" value="${f.reteica}" style="width:100%; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;"></div>
           <div style="background: rgba(16,185,129,0.1); padding: 10px; border-radius: 8px;"><label style="display:block; color:#10b981; margin-bottom:5px; font-weight:bold;">SALDO FINAL A PAGAR</label><input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" style="width:100%; padding:12px; background:#0f172a; color:#10b981; border:1px solid #10b981; border-radius:8px; font-weight:bold;"></div>
           <button type="submit" style="grid-column: span 3; padding:18px; background:#3b82f6; border:none; border-radius:10px; color:white; font-weight:bold; font-size:18px; cursor:pointer; margin-top:15px; transition: 0.3s;">CONFIRMAR Y GUARDAR CAMBIOS</button>
        </form>
        <div style="text-align:center; margin-top:25px;"><a href="/" style="color:#94a3b8; text-decoration:none; font-size:14px;">← REGRESAR AL PANEL PRINCIPAL SIN GUARDAR</a></div>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('SISTEMA YEGO ACTIVO EN PUERTO ' + PORT)));
