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

// MODELO COMPLETO CON LOS 30+ CAMPOS DE GESTIÓN (NO SE ELIMINÓ NADA)
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

// --- NUEVA RUTA API PARA GUARDADO EXCEL (SIN RECARGAR PÁGINA) ---
app.post('/api/save-cell', async (req, res) => {
  try {
    const { id, campo, valor } = req.body;
    const [registro] = await Finanza.findOrCreate({ where: { cargaId: id } });
    
    // Convertir a mayúsculas para mantener consistencia
    let valorFinal = valor.toUpperCase().trim();
    
    // Si el campo es numérico, limpiar caracteres extra
    const camposNum = ['valor_anticipo', 'sobre_anticipo', 'valor_descuento', 'retefuente', 'reteica', 'saldo_a_pagar', 'dias_sin_pagar', 'dias_sin_cumplir'];
    if (camposNum.includes(campo)) {
      valorFinal = parseFloat(valorFinal.replace(/[^0-9.]/g, '')) || 0;
    }

    await registro.update({ [campo]: valorFinal });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      
      // VALORES QUE VIENEN DE LOGISV20 (NO EDITABLES AQUÍ)
      const fletePagarLogis = Number(c.v_flete || 0);
      const fleteFacturarLogis = Number(c.v_facturar || 0);
      
      const estadoContable = f.est_pago || "PENDIENTE";
      if(estadoContable === 'PENDIENTE') totalPendiente += fletePagarLogis;

      const tdS = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap; outline: none;`;
      
      // Función para celdas editables (Solo para campos de Yego_Finanzas)
      const edit = (campo, valor, extra = "") => `
        <td class="cell-excel" contenteditable="true" data-id="${c.id}" data-campo="${campo}" 
            style="${tdS} ${extra} background: rgba(255,255,255,0.02); cursor: cell;">${valor || ''}</td>`;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdS} color: #94a3b8;">#${c.id}</td>
          <td style="${tdS}">${c.f_doc || '---'}</td>
          <td style="${tdS}">${c.oficina || '---'}</td>
          <td style="${tdS}">${c.orig || '---'}</td>
          <td style="${tdS}">${c.dest || '---'}</td>
          <td style="${tdS}">${c.cli || '---'}</td>
          <td style="${tdS}">${c.cont || '---'}</td>
          <td style="${tdS}">${c.ped || '---'}</td>
          <td style="${tdS} background: rgba(59, 130, 246, 0.1); font-weight: bold; color: #60a5fa;">${c.placa}</td>
          <td style="${tdS}">${c.muc || '---'}</td>
          
          <td style="${tdS} color: #10b981; font-weight: bold; background: rgba(16, 185, 129, 0.05);">$${fletePagarLogis.toLocaleString('es-CO')}</td>
          <td style="${tdS} color: #3b82f6; font-weight: bold; background: rgba(59, 130, 246, 0.05);">$${fleteFacturarLogis.toLocaleString('es-CO')}</td>
          
          <td style="${tdS}">${c.f_act || '---'}</td>
          <td style="${tdS} color: #fbbf24;">${c.est_real || '---'}</td>

          ${edit('tipo_anticipo', f.tipo_anticipo)}
          ${edit('valor_anticipo', f.valor_anticipo)}
          ${edit('sobre_anticipo', f.sobre_anticipo)}
          ${edit('estado_ant', f.estado_ant)}
          ${edit('fecha_pago_ant', f.fecha_pago_ant)}
          ${edit('tipo_cumplido', f.tipo_cumplido)}
          ${edit('fecha_cump_virtual', f.fecha_cump_virtual)}
          ${edit('ent_manifiesto', f.ent_manifiesto)}
          ${edit('ent_remesa', f.ent_remesa)}
          ${edit('ent_hoja_tiempos', f.ent_hoja_tiempos)}
          ${edit('ent_docs_cliente', f.ent_docs_cliente)}
          ${edit('ent_facturas', f.ent_facturas)}
          ${edit('ent_tirilla_vacio', f.ent_tirilla_vacio)}
          ${edit('ent_tiq_cargue', f.ent_tiq_cargue)}
          ${edit('ent_tiq_descargue', f.ent_tiq_descargue)}
          ${edit('presenta_novedades', f.presenta_novedades)}
          ${edit('obs_novedad', f.obs_novedad, "text-align: left; min-width: 200px;")}
          ${edit('valor_descuento', f.valor_descuento, "color: #ef4444;")}
          ${edit('fecha_cump_docs', f.fecha_cump_docs)}
          ${edit('fecha_legalizacion', f.fecha_legalizacion)}
          ${edit('retefuente', f.retefuente)}
          ${edit('reteica', f.reteica)}
          ${edit('saldo_a_pagar', f.saldo_a_pagar, "background: rgba(16, 185, 129, 0.1); color: #10b981; font-weight: bold;")}
          ${edit('estado_final', f.estado_final)}
          ${edit('dias_sin_pagar', f.dias_sin_pagar, "color: #ef4444;")}
          ${edit('dias_sin_cumplir', f.dias_sin_cumplir, "color: #3b82f6;")}

          <td style="padding: 10px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    const thS = `padding: 15px 10px; text-align: center; border-right: 1px solid #475569; border-bottom: 2px solid #3b82f6; white-space: nowrap;`;

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
          <h2 style="margin:0; color: #3b82f6;">YEGO SISTEMA CONTABLE | GRID DINÁMICO</h2>
          <div style="text-align: right; background: rgba(239, 68, 68, 0.1); padding: 5px 15px; border-radius: 6px; border: 1px solid #ef4444;">
            <small style="color:#ef4444; font-weight: bold;">TOTAL POR PAGAR:</small><br>
            <b style="color:#f1f5f9; font-size: 20px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Filtrar por placa..." style="width:100%; padding:12px; margin-bottom:15px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white; outline: none;">
        
        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width: 6800px;">
            <thead style="background:#1e40af; color: white; font-size: 10px; text-transform: uppercase;">
              <tr>
                <th style="${thS}">ID</th><th style="${thS}">FECHA REGISTRO</th><th style="${thS}">OFICINA</th>
                <th style="${thS}">ORIGEN</th><th style="${thS}">DESTINO</th><th style="${thS}">CLIENTE</th>
                <th style="${thS}">CONTENEDOR</th><th style="${thS}">PEDIDO</th><th style="${thS}">PLACA</th>
                <th style="${thS}">MUC</th>
                <th style="${thS} background: #065f46;">VALOR FLETE A PAGAR (LOGIS)</th>
                <th style="${thS} background: #1e3a8a;">VALOR FLETE A FACTURAR (LOGIS)</th>
                <th style="${thS}">FECHA ACTUALIZACIÓN</th>
                <th style="${thS}">ESTADO FINAL LOGIS</th>
                <th style="${thS}">TIPO DE ANTICIPO</th><th style="${thS}">VALOR ANTICIPO</th>
                <th style="${thS}">SOBRE ANTICIPO</th><th style="${thS}">ESTADO</th>
                <th style="${thS}">FECHA DE PAGO ANTICIPO</th><th style="${thS}">TIPO DE CUMPLIDO</th>
                <th style="${thS}">FECHA CUMPLIDO VIRTUAL</th><th style="${thS}">ENTREGA DE MANIFIESTO</th>
                <th style="${thS}">ENTREGA DE REMESA</th><th style="${thS}">ENTREGA DE HOJA DE TIEMPOS</th>
                <th style="${thS}">ENTREGA DE DOCUMENTOS CLIENTE</th><th style="${thS}">ENTREGA DE FACTURAS</th>
                <th style="${thS}">ENTREGA DE TIRILLA CON. VACÍO</th><th style="${thS}">ENTREGA DE TIQUETE DE CARGUE</th>
                <th style="${thS}">ENTREGA DE TIQUETE DE DESCARGUE</th><th style="${thS}">¿PRESENTA NOVEDADES?</th>
                <th style="${thS}">OBSERVACION NOVEDAD</th><th style="${thS}">VALOR DESCUENTO</th>
                <th style="${thS}">FECHA CUMPLIDO DOCUMENTOS</th><th style="${thS}">FECHA DE LEGALIZACIÓN</th>
                <th style="${thS}">RETEFUENTE</th><th style="${thS}">RETEICA</th>
                <th style="${thS}">SALDO A PAGAR</th><th style="${thS}">ESTADO</th>
                <th style="${thS}">DÍAS SIN PAGAR</th><th style="${thS}">DÍAS SIN CUMPLIR</th>
                <th style="${thS}">ACCIÓN</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>

        <script>
          // BUSCADOR
          document.getElementById('buscador').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.fila-carga').forEach(fila => {
              fila.style.display = fila.getAttribute('data-placa').includes(term) ? '' : 'none';
            });
          });

          // LÓGICA EXCEL (GUARDADO AUTOMÁTICO)
          document.querySelectorAll('.cell-excel').forEach(cell => {
            cell.addEventListener('blur', async function() {
              const payload = {
                id: this.getAttribute('data-id'),
                campo: this.getAttribute('data-campo'),
                valor: this.innerText.trim()
              };

              this.style.background = 'rgba(59, 130, 246, 0.2)'; // Color de carga

              try {
                const response = await fetch('/api/save-cell', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                if (response.ok) {
                  this.style.background = 'rgba(16, 185, 129, 0.2)'; // Éxito
                  setTimeout(() => this.style.background = 'rgba(255,255,255,0.02)', 1000);
                }
              } catch (err) {
                this.style.background = 'rgba(239, 68, 68, 0.3)'; // Error
              }
            });

            // Evitar saltos de línea con Enter y guardar
            cell.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                cell.blur();
              }
            });
          });
        </script>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// RUTA DE EDICIÓN MANUAL (SE MANTIENE IGUAL POR SEGURIDAD)
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(\`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding: 20px;">
      <div style="max-width:1000px; margin:auto; background:#1e293b; padding:30px; border-radius:12px; border:1px solid #3b82f6;">
        <h2 style="color:#3b82f6; text-align: center; margin-bottom:25px;">FORMULARIO DE LIQUIDACIÓN #${req.params.id}</h2>
        <form action="/guardar/\${req.params.id}" method="POST" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          <div><label>TIPO ANTICIPO</label><input type="text" name="tipo_anticipo" value="\${f.tipo_anticipo||''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="\${f.valor_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>SOBRE ANTICIPO</label><input type="number" name="sobre_anticipo" value="\${f.sobre_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>FECHA PAGO ANT</label><input type="date" name="fecha_pago_ant" value="\${f.fecha_pago_ant||''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          
          <div style="grid-column: span 3; background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #334155;">
             <p style="margin:0 0 10px; color:#3b82f6; font-weight:bold;">CONTROL DE DOCUMENTOS</p>
             <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 11px;">
                <label>MANIFIESTO <input type="text" name="ent_manifiesto" value="\${f.ent_manifiesto}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>REMESA <input type="text" name="ent_remesa" value="\${f.ent_remesa}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>HOJA TIEMPOS <input type="text" name="ent_hoja_tiempos" value="\${f.ent_hoja_tiempos}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>DOCS CLIENTE <input type="text" name="ent_docs_cliente" value="\${f.ent_docs_cliente}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
             </div>
          </div>

          <div><label>RETEFUENTE</label><input type="number" name="retefuente" value="\${f.retefuente}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>RETEICA</label><input type="number" name="reteica" value="\${f.reteica}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>VALOR DESCUENTO</label><input type="number" name="valor_descuento" value="\${f.valor_descuento}" style="width:100%; padding:8px; background:#0f172a; color:#ef4444; border:1px solid #334155;"></div>
          <div><label>SALDO FINAL</label><input type="number" name="saldo_a_pagar" value="\${f.saldo_a_pagar}" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #10b981; font-weight:bold;"></div>

          <button type="submit" style="grid-column: span 3; padding:15px; background:#3b82f6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">ACTUALIZAR DATOS</button>
        </form>
        <p style="text-align:center; margin-top:15px;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Volver al listado</a></p>
      </div>
    </body>\`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 SISTEMA OPERATIVO')));
