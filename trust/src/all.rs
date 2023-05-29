use std::process::ExitCode;

#[derive(clap::Args, Debug)]
pub struct Command {}

impl Command {
    pub async fn run(self) -> anyhow::Result<ExitCode> {
        let mut tasks = Vec::new();

        tasks.push(tokio::spawn(async move {
            let bom = bombastic_api::Run::new().run();
            bom.await.unwrap();
        }));

        tasks.push(tokio::task::spawn(async move {
            let vex = vexination_api::Run::new().run();
            vex.await.unwrap();
        }));

        futures::future::join_all(tasks).await;
        Ok(ExitCode::SUCCESS)
    }
}
