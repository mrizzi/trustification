use std::path::PathBuf;
use std::process::ExitCode;

use guac::collector::emitter::NatsEmitter;
use strum_macros::Display;

pub mod exporter;

#[derive(clap::ValueEnum, Debug, Clone)]
pub enum Events {
    #[clap(name = "kafka")]
    Kafka,
    #[clap(name = "sqs")]
    Sqs,
}

#[derive(clap::ValueEnum, Debug, Clone, Display)]
#[strum(serialize_all = "lowercase")]
pub enum Storage {
    #[clap(name = "bombastic")]
    Bombastic,
    #[clap(name = "vexation")]
    Vexation,
}

#[derive(clap::Args, Debug)]
#[command(about = "Run the exporter", args_conflicts_with_subcommands = true)]
pub struct Run {
    #[arg(short = 'i', long = "index")]
    pub(crate) index: Option<PathBuf>,

    #[arg(long = "kafka-bootstrap-servers", default_value = "localhost:9092")]
    pub(crate) kafka_bootstrap_servers: String,

    #[arg(long = "guac-url", default_value = "127.0.0.1:4222")]
    pub(crate) guac_url: String,

    // Event bus used to communicate with other services.
    #[arg(long = "events", value_enum, default_value = "kafka")]
    pub(crate) events: Events,

    #[arg(long = "stored-topic", default_value = "sbom-stored")]
    pub(crate) stored_topic: String,

    #[arg(long = "devmode", default_value_t = false)]
    pub(crate) devmode: bool,

    #[arg(long = "storage", value_enum, default_value = None)]
    pub(crate) storage: Storage,

    #[arg(long = "storage-endpoint", default_value = None)]
    pub(crate) storage_endpoint: Option<String>,
}

impl Run {
    pub async fn run(self) -> anyhow::Result<ExitCode> {
        let storage = trustification_storage::create(&self.storage.to_string(), self.devmode, self.storage_endpoint)?;
        use trustification_event_bus::EventBus;
        let emitter = NatsEmitter::new(&self.guac_url).await?;
        match self.events {
            Events::Kafka => {
                let bootstrap = &self.kafka_bootstrap_servers;
                let bus = trustification_event_bus::kafka::KafkaEventBus::new(bootstrap.to_string())?;
                if self.devmode {
                    bus.create(&[self.stored_topic.as_str()]).await?;
                }
                exporter::run(storage, bus, emitter, self.stored_topic.as_str()).await?;
            }
            Events::Sqs => {
                let bus = trustification_event_bus::sqs::SqsEventBus::new().await?;
                exporter::run(storage, bus, emitter, self.stored_topic.as_str()).await?;
            }
        }
        Ok(ExitCode::SUCCESS)
    }
}