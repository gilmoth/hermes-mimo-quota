import { host, useValue, useQuery, queryClient, Button, ROUTES_AREA, SIDEBAR_NAV_AREA, PALETTE_AREA } from '@hermes/plugin-sdk';
import { jsx, jsxs } from 'react/jsx-runtime';

const ID = 'mimo-quota';
const nf = new Intl.NumberFormat('es-ES');
const pct = x => `${x.toLocaleString('es-ES', {maximumFractionDigits: 2})} %`;
const when = x => new Date(x).toLocaleString('es-ES', {timeZone: 'Europe/Madrid'});
const label = {color: 'var(--ui-text-secondary)', fontSize: 13};
const panel = {border: '1px solid var(--ui-stroke-secondary)', borderRadius: 14, padding: 16};
const clamp = x => Math.max(0, Math.min(100, x));
function Metric({title, value, subtitle}) {
  return jsxs('section', {style: panel, children: [
    jsx('div', {style: label, children: title}),
    jsx('div', {style: {fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 650, marginTop: 8, fontVariantNumeric: 'tabular-nums'}, children: value}),
    jsx('div', {style: {...label, marginTop: 8}, children: subtitle}),
  ]});
}
function Progress({value, title}) {
  return jsx('div', {role: 'progressbar', 'aria-label': title, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': clamp(value),
    style: {height: 12, borderRadius: 20, background: 'var(--ui-stroke-secondary)', overflow: 'hidden'},
    children: jsx('div', {style: {width: `${clamp(value)}%`, height: '100%', background: 'var(--ui-accent)', borderRadius: 20}})});
}
function Gauge({value}) {
  const radius = 76, circle = 2 * Math.PI * radius;
  return jsx('svg', {viewBox: '0 0 220 220', role: 'img', 'aria-label': `${pct(value)} de créditos consumidos`,
    style: {width: '100%', maxWidth: 180, margin: '0 auto', display: 'block'}, children: [
      jsx('circle', {cx: 110, cy: 110, r: radius, fill: 'none', stroke: 'var(--ui-stroke-secondary)', strokeWidth: 15}, 'bg'),
      jsx('circle', {cx: 110, cy: 110, r: radius, fill: 'none', stroke: 'var(--ui-accent)', strokeWidth: 15,
        strokeDasharray: `${circle * clamp(value) / 100} ${circle}`, transform: 'rotate(-90 110 110)', strokeLinecap: 'round'}, 'used'),
      jsx('text', {x: 110, y: 108, textAnchor: 'middle', fill: 'var(--ui-text-primary)', fontSize: 28, fontWeight: 650, children: pct(value)}, 'value'),
      jsx('text', {x: 110, y: 133, textAnchor: 'middle', fill: 'var(--ui-text-secondary)', fontSize: 13, children: 'del plan consumido'}, 'caption'),
    ]});
}
function Page({query, profile}) {
  const result = query.data, d = result?.data;
  const now = Date.now();
  const elapsed = d ? clamp(100 * (now - Date.parse(d.start_at)) / (Date.parse(d.end_at) - Date.parse(d.start_at))) : 0;
  const days = d ? Math.max(0, Math.ceil((Date.parse(d.end_at) - now) / 86400000)) : 0;
  return jsxs('main', {style: {height: '100%', overflow: 'auto', padding: '20px', color: 'var(--ui-text-primary)'}, children: [
    jsxs('div', {style: {maxWidth: 940, margin: '0 auto', display: 'grid', gap: 16}, children: [
      jsxs('header', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap'}, children: [
        jsxs('div', {children: [jsx('div', {style: {...label, letterSpacing: 2, fontSize: 11}, children: 'CUOTA OFICIAL · XIAOMI'}),
          jsx('h1', {style: {fontSize: 26, margin: '6px 0'}, children: 'MiMo TokenPlan'}),
          jsx('p', {style: {...label, margin: 0}, children: `Consulta desde el backend ${profile}. Cuota global de la cuenta MiMo.`})]}),
        jsx(Button, {variant: 'outline', disabled: query.isFetching, onClick: () => query.refetch(), children: query.isFetching ? 'Consultando…' : 'Actualizar'}),
      ]}),
      query.isPending && jsx('p', {role: 'status', children: 'Consultando la cuota de MiMo…'}),
      query.isError && jsx('div', {role: 'alert', style: panel, children: 'No se encuentra el backend MiMo. Confirma la conexión a Butler, activa mimo-quota en default y reinicia Desktop.'}),
      result?.error && jsx('div', {role: 'alert', style: panel, children: `${result.stale && d ? 'Mostrando la última lectura válida. ' : ''}${result.error}`}),
      d && jsxs('div', {style: {display: 'grid', gap: 16}, children: [
        jsxs('section', {style: {...panel, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 22}, children: [
          jsx('div', {style: {flex: '0 1 180px', minWidth: 150}, children: jsx(Gauge, {value: d.percent})}),
          jsxs('div', {style: {flex: '1 1 300px'}, children: [
            jsx('div', {style: label, children: `PLAN ${d.plan.toUpperCase()} · REGIÓN EUROPEA AMS`}),
            jsx('h2', {style: {fontSize: 22, margin: '8px 0'}, children: `Te queda el ${pct(100 - d.percent)}`}),
            jsx('p', {style: label, children: `${nf.format(d.used)} de ${nf.format(d.total)} créditos consumidos.`}),
            jsx(Progress, {value: d.percent, title: 'Consumo del plan'}),
            jsx('p', {style: {...label, marginBottom: 0}, children: 'Créditos de la suscripción. No equivalen directamente a tokens del modelo.'}),
          ]}),
        ]}),
        jsx('div', {style: {display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16}, children: [
          jsx(Metric, {title: 'Consumidos', value: nf.format(d.used), subtitle: 'Créditos acumulados del periodo'}, 'used'),
          jsx(Metric, {title: 'Disponibles', value: nf.format(d.remaining), subtitle: 'Créditos restantes según MiMo'}, 'remaining'),
          jsx(Metric, {title: 'Fin del periodo', value: `${days} días`, subtitle: when(d.end_at) + ' · Madrid'}, 'end'),
        ]}),
        jsxs('section', {style: panel, children: [
          jsx('h2', {style: {fontSize: 17, marginTop: 0}, children: 'Tiempo transcurrido'}),
          jsx(Progress, {value: elapsed, title: 'Tiempo transcurrido del periodo'}),
          jsxs('div', {style: {display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 12, ...label}, children: [
            jsx('span', {children: `Inicio ${when(d.start_at)}`}), jsx('span', {children: `Fin ${when(d.end_at)}`}),
          ]}),
          jsx('p', {style: label, children: `${pct(elapsed)} del periodo transcurrido. Renovación automática ${d.auto_renew ? 'activada' : 'desactivada'}.`}),
        ]}),
        jsxs('footer', {style: {...label, fontSize: 12, lineHeight: 1.7}, children: [
          jsx('div', {children: `${result.stale ? 'Última lectura válida' : 'Última actualización'} ${when(d.updated_at)} · Madrid.`}),
          jsx('div', {children: 'Actualización cada 60 segundos mientras esta página está abierta. Solo consulta la cuota; no genera llamadas al modelo.'}),
          jsx('div', {children: 'Sin desglose por modelo ni curva diaria: esta API no devuelve esos datos. No se leen tus conversaciones.'}),
        ]}),
      ]}),
    ]}),
  ]});
}
export default {
  id: ID, name: 'MiMo · Cuota del plan', defaultEnabled: false,
  register(ctx) {
    let disposed = false;
    const cache = [ID, ctx.source, Date.now()];
    const scopeNow = () => JSON.stringify([host.state.connectionId.get() || 'local', host.state.profile.get() || 'default']);
    function ScopedPage() {
      const connection = useValue(host.state.connectionId) || 'local';
      const profile = useValue(host.state.profile) || 'default';
      const scope = JSON.stringify([connection, profile]);
      const query = useQuery({
        queryKey: [...cache, connection, profile], retry: false, gcTime: 0,
        staleTime: 60000, refetchInterval: 60000, refetchIntervalInBackground: false,
        queryFn: async () => {
          if (disposed || scope !== scopeNow()) throw new Error('Conexión cambiada');
          const data = await ctx.rest('/quota', {timeoutMs: 20000});
          if (disposed || scope !== scopeNow()) throw new Error('Conexión cambiada');
          return data;
        },
      });
      return jsx(Page, {query, profile}, scope);
    }
    ctx.onDispose(() => { disposed = true; void queryClient.cancelQueries({queryKey: cache}); queryClient.removeQueries({queryKey: cache}); });
    ctx.registerMany([
      {id: 'page', area: ROUTES_AREA, data: {path: '/mimo-quota'}, render: () => jsx(ScopedPage, {})},
      {id: 'nav', area: SIDEBAR_NAV_AREA, data: {path: '/mimo-quota', label: 'MiMo · Cuota', codicon: 'pie-chart'}},
      {id: 'open', area: PALETTE_AREA, data: {id: 'mimo-quota.open', label: 'Abrir cuota MiMo', keywords: ['mimo', 'cuota', 'creditos'], run: () => host.navigate('/mimo-quota')}},
    ]);
  },
};
