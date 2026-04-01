# Usaremos una imagen oficial de Node muy ligera (Alpine)
FROM node:20-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar todos los archivos del juego a la carpeta /app
COPY . .

# Instalar el servidor estático 'serve' globalmente
RUN npm install -g serve

# Exponer el puerto 3000 por defecto que utiliza serve
EXPOSE 3000

# El comando por defecto apuntará directamente a la carpeta del juego
CMD ["serve", "boss-fight-ml5", "-l", "3000"]
