FROM node:20-bookworm

# Render Free tem pouca memória. Esta versão compila LibreDWG de forma mais lenta,
# mas mais estável: sem paralelismo e com dependências completas.
ENV MAKEFLAGS="-j1"

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
    help2man \
    python3 \
    perl \
    libxml2-dev \
    libpcre2-dev \
    zlib1g-dev \
  && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://git.savannah.gnu.org/git/libredwg.git /tmp/libredwg \
  && cd /tmp/libredwg \
  && autoreconf -fi \
  && ./configure --prefix=/usr/local \
  && make \
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
