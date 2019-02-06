# AWS CLI In Docker

The other day at work, I was required to compile a list of AWS resources. I didnt want to install the `aws cli` which required me to install python. Then I happen to stumble upon dockerhub page for [mesosphere/aws-cli](https://hub.docker.com/r/mesosphere/aws-cli), it put a sweet smile on my face.

It suggested to add alias to `docker run` command to the alpine container to be use as drop-in replacement in any shell. I adapted the suggestion to my powershell environment as follows:

```powershell
PS c:\> function Execute-AwsCli {
>> docker run --rm -it -e "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" -e "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" -e "AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION" -v "$(pwd):/project" mesosphere/aws-cli @args
>> }
PS C:\> Set-Alias aws Execute-AwsCli
PS C:\> aws help
usage: aws [options] <command> <subcommand> [<subcommand> ...] [parameters]
To see help text, you can run:

  aws help
  aws <command> help
  aws <command> <subcommand> help
aws: error: too few arguments
PS C:\>
```

Now I can use `aws` cli just like I would do if I had installed it on my local machine.
