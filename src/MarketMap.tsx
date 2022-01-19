import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    scaleLinear,
    select,
    descendants,
    groups,
    treemap,
    hierarchy,
} from 'd3';

const drawMarket = (
    ref: HTMLDivElement,
    data: any,
    size = { w: 954, h: 460, m: { t: 40, r: 10, b: 10, l: 40 } },
) => {
    const canvas = select(ref);

    if ([...canvas.selectAll('svg')].length > 0) {
        console.log('Clearing');
        canvas.selectAll('svg').remove();
    }
    const gW = size.w - size.m.l - size.m.r;
    const gH = size.h - size.m.t - size.m.b;
    const svg = canvas
        .append('svg')
        .attr('width', size.w)
        .attr('height', size.h);

    const g = svg
        .append('g')
        .attr('width', gW)
        .attr('height', gH)
        .style('font-family', 'Neuton')
        .style('font-weight', 500)
        .attr('transform', `translate(${size.m.l},${size.m.t})`);

    const rootData = hierarchy(data.sec);
    rootData.eachAfter((d) => {
        // console.log(d);
        if (!d.hasOwnProperty('children')) {
            d.value = d.data.value;
        } else {
            d.value = 0;
            for (var i in d.children) {
                d.value +=
                    d.depth === 3
                        ? d.children[i].value + 50
                        : d.children[i].value;
            }
        }
    });
    treemap()
        .round(false)
        .size([gW, gH])
        .paddingOuter(0)
        .paddingInner(0)
        .paddingTop(19)(rootData);

    let color = scaleLinear()
        .domain([-3, 0, 3])
        .range(['rgb(243, 43, 2)', '#2A2C36', 'rgb(43, 253, 2)']);

    // const node = g.selectAll('g');
    // .join('g')
    // .selectAll('g')
    // .data((d) => d[1])
    // .join('g')
    // .attr('transform', (d) => `translate(${d.x0 + 20}, ${d.y0 + 20})`)
    // .attr('fill', '#2A2C36CC');

    g.selectAll('rect')
        .data(rootData.descendants())
        .enter()
        .append('rect')
        .attr('id', (d) => (d.nodeUid = d.data.name))
        .attr('x', (d) => d.x0)
        .attr('y', (d) => d.y0)
        .attr('width', (d) => d.x1 - d.x0)
        .attr('height', (d) => d.y1 - d.y0)
        .attr('stroke', 'white')
        .attr('fill', (d) =>
            d.depth === 3
                ? color(data.map[d.data.name])
                : d.depth === 0
                ? 'white'
                : d.depth === 1
                ? '#2A2C36CC'
                : '#020616',
        );
    // .attr('transform', `translate(${10}, ${20})`);

    g.append('g')
        .selectAll('text')
        .data(rootData.descendants())
        .join('text')
        .text((d, i, n) => {
            return d.x1 - d.x0 < 50 || d.y1 - d.y0 < 50
                ? ''
                : d.data.name.length > (d.x1 - d.x0) / 8
                ? d.data.name.slice(0, 5)
                : d.data.name;
        })
        .attr('dx', (d) => d.x0 + 3)
        .attr('y', (d) => d.y0 + 15)
        .attr('transform', (d) =>
            d.depth === 3
                ? `translate(${(d.x1 - d.x0) / 4}, ${(d.y1 - d.y0) / 4})`
                : '',
        )
        .attr('fill', (d) => (d.depth === 2 ? 'white' : 'white'))
        .attr('font-weight', (d) => (d.depth === 3 ? 700 : 900));

    // g.selectAll('rect')
    //     .attr('fill', (d) => color(data.map[d.data.name]))
    //     .attr('fill-opacity', (d, i, n) => {
    //         return 0.8;
    //     })
    //     .attr('id', (d) => d.data.name)
    //     .attr('stroke', 'black');

    // g.append('g')
    //     .selectAll('text')
    //     .data((d) => d)
    //     .join('text')
    //     .each(function () {
    //         select(this).text((d) => {
    //             console.log({ depth: d.depth, name: d.data.name }, d);
    //             switch (d.depth) {
    //                 case 0: {
    //                     return d.data.name;
    //                 }
    //                 case 1: {
    //                     return d.data.name;
    //                 }
    //             }
    //         });
    //     })
    //     .attr('id', (d) => d.data.name);

    // g.filter((d) => d.children)
    //     .selectAll('text')
    //     .attr('dx', 3)
    //     .attr('y', 13)
    //     .attr('fill', 'white')
    //     .attr('font-weight', 900)
    //     .attr('transform', 'translate(0, 0)');

    // g.filter((d) => !d.children)
    //     .selectAll('text')
    //     .attr('x', 3)
    //     .attr('y', 13)
    //     .attr('fill', 'white')
    //     .attr('transform', `translate(${20}, ${20})`);

    svg.selectAll('rect').on('mouseover', (e, n) => {
        // svg.selectAll(n.data.name).attr('stroke', 'white');
    });
};

export const MarketMap = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [market, setMarket] = useState({});

    // fetch data
    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            let sec = await axios.get('http://localhost:3000/sec', {
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
            });

            let map = await axios.get('http://localhost:3000/map', {
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
            });

            if (
                sec?.data?.children.length > 0 &&
                Object.keys(map.data.nodes).length > 0
            ) {
                setMarket({ sec: sec?.data, map: map?.data?.nodes });
            }
        };

        fetchData();

        return () => controller.abort();
    }, []);

    // draw table
    useEffect(() => {
        if (ref.current && Object.keys(market).length > 0) {
            drawMarket(ref.current, market);
        }
    }, [market, ref.current]);

    return <div ref={ref} className='market_map'></div>;
};
