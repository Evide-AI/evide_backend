import express from 'express'
import { sequelize } from '../config/db.js';

const app = express()

app.get('/health', (req, res)=>{
    res.json({
        status: 'OK',
        message: 'Evide API Server is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/health/db', async (req, res)=>{
    try{
       await sequelize.authenticate() 
       res.json({
        status: 'OK',
        database: 'Connected',
        timestamp: new Date().toISOString()
       });
    }catch(error){
        res.status(500).json({
            status: 'Error',
            database: 'Disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api', (req, res)=>{
    res.json({
        message: 'Evide backend API is ready for development',
        version: '1.0.0',
        endpoints:{
            health: '/health',
            database: '/health/db',
            api: '/api'
        }
    });
});

app.use((req, res)=>{
    res.status(404).json({
        error: 'Route not found',
        message: 'The requested endpoint does not exist',
        path: req.originalUrl
    });
});

export default app