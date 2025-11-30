# Synapse

## Overview

This system allows users to search a 25K+ image dataset using both *natural-language text queries* and *uploaded images. It employs the **Meta ImageBind model* to generate cross-modal embeddings for text and image inputs. The backend is optimized for high-performance search and retrieval, leveraging *Qdrant vector database, **FastAPI, **Redis, and **AWS S3* for scalable storage. The frontend is built with *Next.js* to support a rich, interactive search experience.

---

## Architecture Overview

•⁠  ⁠*ImageBind Model*: Used to generate cross-modal embeddings for both text and image inputs.
•⁠  ⁠*Qdrant Vector Database*: Stores and retrieves embeddings with HNSW indexing for fast and accurate search.
•⁠  ⁠*FastAPI Backend*: Manages embedding generation, preprocessing, and vector retrieval.
•⁠  ⁠*Redis*: Caching layer to reduce repeated embedding calls and increase efficiency.
•⁠  ⁠*AWS S3*: Used to store assets like thumbnails, original images, and user-uploaded queries.
•⁠  ⁠*Next.js Frontend*: A unified search bar that supports text queries and image uploads, featuring real-time result rendering, preview modals, and optimized image loading.
•⁠  ⁠*Docker & Kubernetes*: Containerized for easy deployment and scalability. Multiple backend replicas ensure load balancing and reliability.

---

## Prerequisites

Before setting up the project, make sure you have the following installed:

•⁠  ⁠*Docker* (for containerization)
•⁠  ⁠*Docker Compose* (for local orchestration)
•⁠  ⁠*Python 3.8+* (for the backend services)
•⁠  ⁠*Node.js* and *npm* (for the frontend)
•⁠  ⁠*AWS CLI* (if you're using AWS S3 for asset storage)
•⁠  ⁠*Redis* (for caching)
•⁠  ⁠*Qdrant* (vector database)

Ensure that your environment has access to any necessary cloud services, such as AWS S3 and Qdrant.

---

## Backend Setup

### 1. Clone the Repository

Clone the project repository to your local machine:

⁠ bash
git clone https://github.com/akshttdev/synapse.git
cd multimodal-search-engine
 ⁠

### 2. Backend Dependencies

Navigate to the backend directory and install required Python dependencies.

⁠ bash
cd backend
pip install -r requirements.txt
 ⁠

### 3. Set up Qdrant

Ensure you have a Qdrant instance running. You can either use the managed cloud version or run it locally with Docker:

⁠ bash
docker run -p 6333:6333 qdrant/qdrant
 ⁠

Make sure your backend connects to the Qdrant instance through the correct port (default ⁠ 6333 ⁠).

### 4. Redis Configuration

Install and run Redis locally, or use a managed Redis service:

⁠ bash
docker run -p 6379:6379 redis
 ⁠

In the backend ⁠ .env ⁠ file, ensure that the Redis connection settings are correctly configured:


REDIS_HOST=localhost
REDIS_PORT=6379


### 5. FastAPI Backend Configuration

Make sure your FastAPI service is correctly configured to handle the endpoints for embedding generation, image upload, and retrieval.

•⁠  ⁠Update the environment variables in ⁠ .env ⁠:

⁠ env
IMAGEBIND_API_KEY=your_api_key
QDRANT_HOST=localhost
QDRANT_PORT=6333
REDIS_HOST=localhost
REDIS_PORT=6379
S3_BUCKET_NAME=your_s3_bucket
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
 ⁠

•⁠  ⁠Start the FastAPI backend:

⁠ bash
uvicorn main:app --host 0.0.0.0 --port 8000
 ⁠

### 6. ImageBind Model

Ensure you have access to Meta’s *ImageBind* model. You'll need to initialize it and integrate it into your FastAPI backend to handle cross-modal embedding generation.

---

## Frontend Setup

### 1. Install Frontend Dependencies

Navigate to the ⁠ frontend ⁠ directory and install the necessary dependencies.

⁠ bash
cd frontend
npm install
 ⁠

### 2. Configure S3 Access

In your frontend ⁠ .env.local ⁠, add your S3 credentials and bucket details.

⁠ env
NEXT_PUBLIC_S3_BUCKET=your_s3_bucket
NEXT_PUBLIC_S3_REGION=your_s3_region
NEXT_PUBLIC_S3_ACCESS_KEY=your_access_key
NEXT_PUBLIC_S3_SECRET_KEY=your_secret_key
 ⁠

### 3. Running the Frontend

Start the frontend with the following command:

⁠ bash
npm run dev
 ⁠

This will start the development server at ⁠ http://localhost:3000 ⁠.

---

## Docker Setup

### 1. Dockerize the Application

The entire system is containerized with Docker for easy setup and scalability. If you're running the application locally, you can use Docker Compose to set up both the frontend and backend services.

Ensure you have a ⁠ docker-compose.yml ⁠ file in your project root.

⁠ yaml
version: '3'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - IMAGEBIND_API_KEY=${IMAGEBIND_API_KEY}
      - QDRANT_HOST=localhost
      - QDRANT_PORT=6333
      - REDIS_HOST=localhost
      - REDIS_PORT=6379
      - S3_BUCKET_NAME=${S3_BUCKET_NAME}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_S3_BUCKET=${NEXT_PUBLIC_S3_BUCKET}
      - NEXT_PUBLIC_S3_ACCESS_KEY=${NEXT_PUBLIC_S3_ACCESS_KEY}
      - NEXT_PUBLIC_S3_SECRET_KEY=${NEXT_PUBLIC_S3_SECRET_KEY}
    depends_on:
      - backend
 ⁠

### 2. Start Docker Containers

To start the system with Docker Compose, run:

⁠ bash
docker-compose up --build
 ⁠

This will start both the backend and frontend services, and you can access the system at ⁠ http://localhost:3000 ⁠.

---

## Key Features

### 1. *Search by Text Query*:

Users can input text queries in the search bar. The system generates text embeddings and retrieves similar image results from the Qdrant database.

### 2. *Search by Image Upload*:

Users can upload an image, and the system generates an image embedding to find similar images in the dataset.

### 3. *Real-time Results Rendering*:

The frontend updates the search results in real-time, showing the most relevant images as the user types or uploads an image.

### 4. *Optimized Image Loading*:

The frontend uses Next.js's built-in ⁠ <Image> ⁠ component for optimized image loading, ensuring faster load times and better performance.

### 5. *Preview Modals*:

Clicking on an image in the search results opens a preview modal, displaying the image in full size.

---

## Scaling and Deployment

To deploy the system in production, consider using *Kubernetes* for orchestration and scaling. You can create a deployment configuration for both the backend and frontend services, and use a cloud provider like AWS, GCP, or Azure for infrastructure management.

1.⁠ ⁠*Containerize the services*: Ensure both backend and frontend are containerized using Docker.
2.⁠ ⁠*Set up Kubernetes*: Use Kubernetes to manage multiple replicas for high availability.
3.⁠ ⁠*Use managed services: For production, you can opt for managed services like **AWS Elasticache* for Redis, *AWS S3* for asset storage, and *Qdrant Cloud* for the vector database.

---

## Troubleshooting

### Common Issues

1.⁠ ⁠*Redis connection issues*:
   Ensure Redis is running and that the backend can connect to it through the correct ⁠ REDIS_HOST ⁠ and ⁠ REDIS_PORT ⁠.

2.⁠ ⁠*Qdrant search latency*:
   If search queries are slow, check the indexing strategy in Qdrant and ensure HNSW indexing is correctly configured for optimal performance.

3.⁠ ⁠*Image loading performance*:
   If image loading is slow, ensure that Next.js's image optimization settings are properly configured. Consider using a CDN for assets in production.

4.⁠ ⁠*Cross-origin issues*:
   If you're running the frontend and backend on different domains or ports, ensure CORS settings are configured properly in FastAPI.

---

## Conclusion

This multimodal search engine is designed for scalability and performance, allowing users to interact with a large dataset using both text and image queries. By leveraging modern technologies like *ImageBind, **Qdrant, **FastAPI, **Next.js, and **Docker*, the system ensures an optimized search experience. With proper setup, the system can handle large volumes of data and high user traffic efficiently.
