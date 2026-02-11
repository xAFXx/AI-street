FROM httpd:latest
COPY dist/browser/ /usr/local/apache2/htdocs/

CMD sh /usr/local/apache2/htdocs/assets/start.sh; httpd-foreground
