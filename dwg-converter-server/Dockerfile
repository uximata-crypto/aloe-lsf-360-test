FROM node:20-bookworm

# Instala ferramentas para compilar LibreDWG a partir do código-fonte.
# Isto evita o erro do Render quando o pacote libredwg-tools não existe no apt.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    build-essential \
    autoconf \
    automake \
    libtool \
    pkg-config \
    texinfo \
    python3 \
  && rm -rf /var/lib/apt/lists/*

# Compila e instala LibreDWG / dwgread
RUN git clone --depth 1 https://git.savannah.gnu.org/git/libredwg.git /tmp/libredwg \
  && cd /tmp/libredwg \
  && autoreconf -fi \
  && ./configure --prefix=/usr/local \
  && make -j2 \
  && make install \
  && ldconfig \
  && dwgread --version \
  && rm -rf /tmp/libredwg

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js ./

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
