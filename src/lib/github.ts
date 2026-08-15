import { Octokit } from "octokit";

const token =
  process.env.GITHUB_TOKEN;

const owner =
  process.env.GITHUB_OWNER;

const repo =
  process.env.GITHUB_REPO;

const branch =
  process.env.GITHUB_BRANCH ||
  "main";

function getConfig() {
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN belum dikonfigurasi."
    );
  }

  if (!owner) {
    throw new Error(
      "GITHUB_OWNER belum dikonfigurasi."
    );
  }

  if (!repo) {
    throw new Error(
      "GITHUB_REPO belum dikonfigurasi."
    );
  }

  return {
    token,
    owner,
    repo,
    branch,
  };
}

function getOctokit() {
  const config =
    getConfig();

  return {
    octokit: new Octokit({
      auth: config.token,
    }),
    config,
  };
}

/*
|--------------------------------------------------------------------------
| READ FILE
|--------------------------------------------------------------------------
*/

export async function readGitHubFile(
  path: string
) {
  const {
    octokit,
    config,
  } =
    getOctokit();

  const response =
    await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path,
      ref: config.branch,
    });

  const data =
    response.data;

  if (
    Array.isArray(data)
  ) {
    throw new Error(
      `Path "${path}" adalah directory, bukan file.`
    );
  }

  if (
    data.type !==
    "file"
  ) {
    throw new Error(
      `Path "${path}" bukan file.`
    );
  }

  if (!data.content) {
    throw new Error(
      `GitHub tidak mengembalikan content untuk "${path}".`
    );
  }

  const content =
    Buffer.from(
      data.content,
      "base64"
    ).toString("utf-8");

  return {
    path: data.path,
    content,
    sha: data.sha,
  };
}

/*
|--------------------------------------------------------------------------
| WRITE FILE
|--------------------------------------------------------------------------
*/

export async function writeGitHubFile(
  path: string,
  content: string,
  message: string,
  sha?: string
) {
  const {
    octokit,
    config,
  } =
    getOctokit();

  const safeMessage =
    message.trim() ||
    `Update ${path}`;

  const response =
    await octokit.rest.repos.createOrUpdateFileContents(
      {
        owner: config.owner,
        repo: config.repo,
        path,
        message:
          safeMessage,
        content:
          Buffer.from(
            content,
            "utf-8"
          ).toString(
            "base64"
          ),
        branch:
          config.branch,
        ...(sha
          ? { sha }
          : {}),
      }
    );

  return {
    path,
    commitSha:
      response.data.commit.sha,
    commitUrl:
      response.data.commit.html_url,
  };
}

/*
|--------------------------------------------------------------------------
| UPDATE EXISTING FILE
|--------------------------------------------------------------------------
*/

export async function updateGitHubFile(
  path: string,
  content: string,
  message: string
) {
  const file =
    await readGitHubFile(
      path
    );

  return await writeGitHubFile(
    path,
    content,
    message,
    file.sha
  );
}
