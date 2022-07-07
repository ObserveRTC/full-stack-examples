FROM jupyter/base-notebook

USER root

# Add requirements file 
ADD requirements.txt /app/

# Installs, clean, and update   
RUN apt-get update \
    && apt-get clean \
    && apt-get update -qqq \
    && apt-get install -y -q g++ \ 
    && pip install --upgrade pip \ 
    && pip install -r /app/requirements.txt

ENV JUPYTER_ENABLE_LAB=yes

CMD jupyter notebook --port=8888 --no-browser --ip=0.0.0.0 --allow-root --NotebookApp.token='' --NotebookApp.password=''

EXPOSE 8888