FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html ./
COPY LICENSE.txt NOTICE.txt THIRD_PARTY_NOTICES.txt ./
COPY src/ ./src/
COPY scripts/create-public-course.mjs scripts/import-course.mjs ./scripts/
RUN node scripts/create-public-course.mjs /public-course && npm run build

FROM nginx:1.30.6-alpine
LABEL org.opencontainers.image.authors="bodharma (https://github.com/bodharma)" \
      org.opencontainers.image.source="https://github.com/bodharma/radio-lab" \
      org.opencontainers.image.licenses="PolyForm-Noncommercial-1.0.0"
COPY docker/nginx.conf /etc/nginx/nginx.conf
RUN rm -rf /usr/share/nginx/html/* && mkdir -p /course
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY --from=build /public-course/course.json /course/course.json
COPY LICENSE.txt NOTICE.txt THIRD_PARTY_NOTICES.txt /usr/share/doc/radio-lab/
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD test -r /course/course.json && test -s /course/course.json && wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
