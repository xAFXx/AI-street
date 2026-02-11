FROM httpd:latest
RUN touch test1.sh
COPY . /usr/local/apache2/htdocs/

CMD sh /usr/local/apache2/htdocs/assets/start.sh; httpd-foreground
