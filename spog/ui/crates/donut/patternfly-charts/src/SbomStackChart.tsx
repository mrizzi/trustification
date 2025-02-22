import React from 'react';
import ReactDOM from 'react-dom/client';

import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartLabel,
  ChartLegend,
  ChartStack,
  ChartThemeColor,
  ChartTooltip,
} from '@patternfly/react-charts';

import lowColor from '@patternfly/react-tokens/dist/esm/chart_color_blue_200';
import mediumColor from '@patternfly/react-tokens/dist/esm/chart_color_gold_300';
import criticalColor from '@patternfly/react-tokens/dist/esm/chart_color_purple_400';
import highColor from '@patternfly/react-tokens/dist/esm/chart_color_red_100';
import noneColor from '@patternfly/react-tokens/dist/esm/global_palette_black_400';

type Severity = 'none' | 'low' | 'medium' | 'high' | 'critical';

interface Legend {
  severity: Severity;
  name: string;
}

interface StackChartProps {
  sbom_id: string;
  sbom_name: string;
  vulnerabilities: {
    [key in Severity]: number;
  };
}

const generateSbomBarName = (sbom: StackChartProps, index: number) => {
  return `${' '.repeat(index + 1)}${sbom.sbom_name}`;
};

export const SbomStackChartRenderer = (htmlElement: HTMLElement, props: StackChartProps[]) => {
  const showTickValues = props.every((item) => {
    return (
      item.vulnerabilities.critical +
        item.vulnerabilities.high +
        item.vulnerabilities.medium +
        item.vulnerabilities.low +
        item.vulnerabilities.none ===
      0
    );
  });

  const legends: Legend[] = [
    { severity: 'critical', name: 'Critical' },
    { severity: 'high', name: 'High' },
    { severity: 'medium', name: 'Medium' },
    { severity: 'low', name: 'Low' },
    { severity: 'none', name: 'None' },
  ];

  const root = ReactDOM.createRoot(htmlElement);
  root.render(
    <React.StrictMode>
      <Chart
        ariaDesc="SBOM summary status"
        domainPadding={{ x: [30, 25] }}
        legendData={legends.map((e) => ({ name: e.name }))}
        legendPosition="bottom-left"
        height={375}
        name="sbom-summary-status"
        padding={{
          bottom: 75,
          left: 330,
          right: 50,
          top: 50,
        }}
        themeColor={ChartThemeColor.multiOrdered}
        width={700}
        legendComponent={
          <ChartLegend
            y={10}
            x={300}
            colorScale={[
              criticalColor.var,
              highColor.var,
              mediumColor.var,
              lowColor.var,
              noneColor.var,
            ]}
          />
        }
      >
        <ChartAxis
          label="Products"
          axisLabelComponent={<ChartLabel dx={0} x={10} y={140} />}
          tickLabelComponent={
            <ChartLabel
              className="pf-v5-c-button pf-m-link pf-m-inline"
              style={[{ fill: '#0066cc' }]}
              events={{
                onClick: (event) => {
                  const sbom_name = (event.target as any).innerHTML as string | null;
                  const sbom = props.find(
                    (item, index) => generateSbomBarName(item, index) === sbom_name,
                  );
                  if (sbom) {
                    const sbomDetailsPage = `/sbom/content/${sbom.sbom_id}`;

                    const wasmBindings = (window as any).wasmBindings;
                    if (wasmBindings) {
                      wasmBindings.spogNavigateTo(sbomDetailsPage);
                    } else {
                      window.open(sbomDetailsPage);
                    }
                  }
                },
              }}
            />
          }
        />
        <ChartAxis
          dependentAxis
          showGrid
          tickValues={showTickValues ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : undefined}
          label="CVEs by Severity"
          fixLabelOverlap={true}
        />
        <ChartStack
          horizontal
          colorScale={[
            criticalColor.var,
            highColor.var,
            mediumColor.var,
            lowColor.var,
            noneColor.var,
          ]}
        >
          {legends.map((legend) => (
            <ChartBar
              key={legend.name}
              labelComponent={<ChartTooltip constrainToVisibleArea />}
              data={props.map((sbom, index) => {
                const severityKey = legend.severity;
                const count = sbom.vulnerabilities[severityKey] as number;
                return {
                  name: legend.name,
                  x: generateSbomBarName(sbom, index),
                  y: count,
                  label: `${legend.name}: ${count}`,
                };
              })}
            />
          ))}
        </ChartStack>
      </Chart>
    </React.StrictMode>,
  );
};
