#!/bin/bash
cd backend_SaaS
uvicorn main_saas:app --host 0.0.0.0 --port $PORT
