# Running Docker Container

Once the image is published:

- ssh into the deployment box
- navigate to the repo
- run `git pull`
- run the following

```shell
docker compose pull
docker compose up -d
```
