import axios from 'axios'

// In production, use the full backend URL (Render). In dev, empty = Vite proxy.
const BASE_URL = import.meta.env.VITE_API_BASE || ''
const api = axios.create({ baseURL: BASE_URL, timeout: 30000 })

export const getSummary          = (days = 5)           => api.get('/api/summary',          { params: { days } })
export const getFlares           = (days = 5)           => api.get('/api/flares',            { params: { days } })
export const getEmitters         = (days = 5, limit=20) => api.get('/api/top_emitters',      { params: { days, limit } })
export const getAlerts           = (days = 5)           => api.get('/api/alerts',            { params: { days } })
export const getTrends           = (days = 5)           => api.get('/api/trends',            { params: { days } })
export const getCountries        = ()                   => api.get('/api/country_emissions')
export const getKnownWells       = ()                   => api.get('/api/known_wells')
export const getOilPrices        = ()                   => api.get('/api/oil_prices')
export const getPulse            = (days = 5)           => api.get('/api/pulse',             { params: { days } })

// World Bank historical flaring data (2012-2024, served from offline Excel)
export const getWBTrends         = (top_n = 10)         => api.get('/api/wb_trends',         { params: { top_n } })
export const getWBCountryHistory = (country)            => api.get('/api/wb_country_history', { params: { country } })
export const getWBLocations      = (country, year)      => api.get('/api/wb_locations',       { params: { country, year } })
export const getWBCountries      = ()                   => api.get('/api/wb_countries')

// Present vs 2024 baseline comparison
export const getCompare2024      = (days = 5)           => api.get('/api/compare_2024',       { params: { days } })

// PetroCopilot — AI agent chat
export const postChat = (messages, context = {}) =>
  api.post('/api/chat', { messages, context }, { timeout: 60000 })

// Plume Simulator — wind vectors per active flare site
export const getWind = (days = 5) => api.get('/api/wind', { params: { days } })

export default api
