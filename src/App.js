import React, {Component} from 'react';
import './App.css';
import {Tab, Tabs, Tooltip, Menu, MenuDivider, MenuItem, Popover, Position, Icon, Colors, Button, Navbar, NavbarGroup, NavbarDivider} from '@blueprintjs/core'
import {DatePicker, DateRangePicker} from "@blueprintjs/datetime"
import {WindowScroller, Table, Column, InfiniteLoader, AutoSizer} from "react-virtualized";

import {dayPickerClassNames} from "./DayPickerClassNames"
import {HiddenRowTable} from "./HiddenRowTable"
import {getTestData} from "./test_data";

function ColorMenuItem(props) {
    return (
        <MenuItem icon={<Icon icon="stop" color={props.color}/>}
                  text={props.text}
                  onClick={props.onClick.bind(null, props.color)}
                  labelElement={props.labelElement}
        />
    );
}

function ColorMenu(props) {
    // Farben können durch Erweiterung des Arrays colors hinzugefügt werden
    let colors = [Colors.VERMILION5, Colors.ROSE5, Colors.VIOLET5, Colors.INDIGO5, Colors.COBALT5, Colors.TURQUOISE5,
        Colors.FOREST5, Colors.LIME5, Colors.GOLD5, Colors.SEPIA5];
    const items = colors.map((color) =>
        <ColorMenuItem color={color} text={"foo"} onClick={props.onColorMenuClick} key={color}/>
    );
    return (
        <MenuItem icon="highlight" text="Markiere Zelle" onClick={() => {}}>
            {items}
        </MenuItem>
    );
}

function MyCell2(props){
    let menu;
    menu = (
      <Menu>
          <ColorMenu onColorMenuClick={props.onColorMenuClick}/>
          {props.color &&
              <MenuItem icon={"eraser"} text={"Unmark"} onClick={props.onMenuClick.bind(null, "eraser")}/>
          }
          <MenuItem icon={"remove"} text={"Hide similar Rows"} onClick={props.onMenuClick.bind(null, "remove")}/>
      </Menu>
    );
    return (
        <Popover content={menu}
                 position={Position.BOTTOM_RIGHT}
                 autoFocus={false} lazy={true}
                 targetTagName={"div"}
                 wrapperTagName={"div"}>
            <div className={"table-cell"} style={{backgroundColor: props.color}}>
                <div className={"hoverOverlay"}/>
                {props.value}
            </div>
        </Popover>
    );
}

class MaTable extends Component {
    constructor(props) {
        super(props);
        // which color to choose for the background of a cell if no color is specified, first element has highest priority
        this.key_color_hierarchie = ["Class", "Name", "State", "HexCode", "Timestamp"];
        // this.key_color_hierarchie = ["State", "Name", "Class", "HexCode", "Timestamp"];

        // dependencies of table columns
        this.key_dependencies = {Name: ["Class"], State: ["Name", "Class"]};
        // ref popover show hidden rows
        this.hiddenRowTableRef = React.createRef();
        this.tableRef = React.createRef();
        // contains all table entries
        this.table_content = this.props.tableContent;

        this.state = ({
            // contains information about which cells are marked
            color: {},
            // contains information about which cells were hidden (content signature)
            removedCells:{},
            // contains all table entris not hidden by the user; this list gets rendered by <Table>
            table_render_content: this.table_content.slice(),
        });

        // scrollToDate will scroll to an index i - scrollOffset
        this.scrollOffset = 2;
        this.headerHeight = 30;
        this.rowHeight = 30;

        this.scrollToDate = this.scrollToDate.bind(this);
        this.setValueWithDependencies = this.setValueWithDependencies.bind(this);
        this.getValueWithDependencies = this.getValueWithDependencies.bind(this);
        this.handleColorMenuClick = this.handleColorMenuClick.bind(this);
        this.handleMenuClick = this.handleMenuClick.bind(this);
        this._renderColumns = this._renderColumns.bind(this);
        this._cellRenderer = this._cellRenderer.bind(this);
        this._miscCellRenderer = this._miscCellRenderer.bind(this);
        this._handleRemoveSpecificRow = this._handleRemoveSpecificRow.bind(this);
        this._showHiddenRowsMiscRenderer = this._showHiddenRowsMiscRenderer.bind(this);
        this.isRowHidingContentTop = this.isRowHidingContentTop.bind(this);
        this.getHiddenRowCount = this.getHiddenRowCount.bind(this);
        this._handleShowMarkedRows = this._handleShowMarkedRows.bind(this);
        this._handleShowAllRows = this._handleShowAllRows.bind(this);
        this._showHiddenRowsMiscRendererTail = this._showHiddenRowsMiscRendererTail.bind(this);
        this.isRowHidingContentTail = this.isRowHidingContentTail.bind(this);
        this.getHiddenRowCountTail = this.getHiddenRowCountTail.bind(this);
        this._handleShowMarkedRowsTail = this._handleShowMarkedRowsTail.bind(this);
        this._handleShowAllRowsTail = this._handleShowAllRowsTail.bind(this);

        this.tabsRenderer = this.tabsRenderer.bind(this);
    }

    static getTableContent(){
        console.log("hello");
        return getTestData();
    }

    tabsRenderer(){
        const keys = Object.keys(this.state.removedCells);
        const tabs = keys.map((key) => {
            return <Tab id={"windmill-view-tabs" + key} title={key} panel={<Button/>}/>
        });
        return (
            <Tabs id={"windmill-view-tabs"}>
                {tabs}
            </Tabs>
        )
    }

    scrollToDate(date){
        if (date === null) return;
        let table_render_content = this.state.table_render_content;
        for (let i = 0; i < table_render_content.length; i++){
            let tmp_date = new Date(table_render_content[i]["Timestamp"]);
            if (tmp_date >= date){
                this.tableRef.current.scrollToRow(Math.max(0, i - this.scrollOffset));
                return;
            }
        }
    }

    // this disregards previous hidden rows, they will be shown again
    filterDates(lower, upper){
        console.log(lower);
        console.log(upper);
        if (lower !== null || upper !== null) {
            let table_render_content = this.table_content.slice();
            if (lower !== null){
                let i = 0;
                while (lower > new Date(table_render_content[i]["Timestamp"])) ++i;
                if (i > 0){
                    console.log(i);
                    table_render_content.splice(0, i);
                }
            }
            if (upper !== null){
                let i = table_render_content.length - 1;
                let tmp = new Date(upper.toString());
                tmp.setHours(24);
                while (tmp < new Date(table_render_content[i]["Timestamp"])) --i;
                if (i < table_render_content.length - 1){
                    table_render_content.splice(i + 1, table_render_content.length - 1 - i);
                }
            }
            this.setState({table_render_content: table_render_content, removedCells: {}});
        }
    }

    setValueWithDependencies(obj, rowData, columnName, cellData, value){
        if (!this.key_dependencies[columnName]){
            if(!obj[columnName]){
                obj[columnName] = {}
            }
            obj[columnName][cellData] = value;
        } else {
            const dependencies = this.key_dependencies[columnName].map(dependence => rowData[dependence]);
            let i = 0;
            if (!obj[columnName]){
                obj[columnName] = {}
            }
            obj = obj[columnName];
            for (i; i < dependencies.length; i++){
                if (!obj[dependencies[i]]){
                    obj[dependencies[i]] = {}
                }
                obj = obj[dependencies[i]]
            }
            obj[cellData] = value;
        }
    }

    getValueWithDependencies(obj, rowData, columnName, cellData){
        if (!this.key_dependencies[columnName]){
            if(!obj[columnName]) return undefined;
            return obj[columnName][cellData];
        }
        const dependencies = this.key_dependencies[columnName].map(dependence => rowData[dependence]);
        let i = 0;
        if (!obj[columnName]) return undefined;
        obj = obj[columnName];
        for (i; i < dependencies.length; i++){
            if (!obj[dependencies[i]]) return undefined;
            obj = obj[dependencies[i]]
        }
        return obj[cellData];
    }

    handleColorMenuClick(row, rowData, columnName, columnIndex, cellData, color){
        let colors = this.state.color;
        this.setValueWithDependencies(colors, rowData, columnName, cellData, color);
        this.setState({color: colors});
    }

    handleMenuClick(row, rowData, columnName, columnIndex, cellData, type){
        if (type === "eraser") {
            let colors = this.state.color;
            if (this.getValueWithDependencies(colors, rowData, columnName, cellData) !== undefined) {
                this.setValueWithDependencies(colors, rowData, columnName, cellData, undefined);
            } else {
                for (let i = 0; i < this.key_color_hierarchie.length; i++) {
                    let dataKey = this.key_color_hierarchie[i];
                    let color = this.getValueWithDependencies(this.state.color, rowData, dataKey, rowData[dataKey]);
                    if (color !== undefined) {
                        this.setValueWithDependencies(this.state.color, rowData, dataKey, rowData[dataKey], undefined);
                        break;
                    }
                }
            }
            this.setState({color: colors})
        } else if(type === "remove"){
            let table_render_content = this.state.table_render_content.slice();
            let i = table_render_content.length;
            let removedCells = this.state.removedCells;
            this.setValueWithDependencies(removedCells, rowData, columnName, cellData, 1);
            // remove rows with the same content (cellData + dependencies) from the rendered content
            while(i--){
                if (this.getValueWithDependencies(removedCells, table_render_content[i], columnName, table_render_content[i][columnName])){
                    table_render_content.splice(i, 1);
                }
            }
            this.setState({removedCells: removedCells, table_render_content: table_render_content});
        }
    }

    _handleRemoveSpecificRow(miscIndex) {
        let table_render_content = this.state.table_render_content.slice();
        let i = table_render_content.length;
        while(i--){
            if (miscIndex === table_render_content[i]["misc"]){
                table_render_content.splice(i, 1);
                break;
            }
        }
        this.setState({table_render_content});
    }

    _handleShowMarkedRows(rowIndex, miscIndex){
        let table_render_content = this.state.table_render_content.slice();
        const keys = Object.keys(this.hiddenRowTableRef.current.checked).map(value => parseInt(value, 10)).sort((a, b) => b - a);
        keys.forEach(key => {
            const tmp = miscIndex - this.getHiddenRowCount(rowIndex, miscIndex) + key;
            table_render_content.splice(rowIndex, 0, this.table_content[tmp]);
        });
        this.setState({table_render_content});
    }

    _handleShowAllRows(rowIndex, miscIndex){
        let table_render_content = this.state.table_render_content.slice();
        let tmp = miscIndex - this.getHiddenRowCount(rowIndex, miscIndex);
        for(let i = miscIndex - 1; i >= tmp; i--){
            table_render_content.splice(rowIndex, 0, this.table_content[i]);
        }
        this.setState({table_render_content});
    }

    isRowHidingContentTop(row, miscIndex){
        if (row === 0){
            return miscIndex !== 0;
        }
        return miscIndex - this.state.table_render_content[row - 1]["misc"] - 1 !== 0;
    }

    getHiddenRowCount(row, miscIndex){
        if (row === 0){
            return miscIndex;
        }
        return miscIndex - this.state.table_render_content[row - 1]["misc"] - 1;
    }

    _showHiddenRowsMiscRenderer(row, miscIndex){
        return (
            <Popover lazy={true} position={"left"}>
                <Tooltip content={"Show previously hidden rows"}>
                    <Icon icon={"chevron-up"}/>
                </Tooltip>
                <Menu>
                    <HiddenRowTable
                        ref = {this.hiddenRowTableRef}
                        width={750}
                        height={170}
                        headerHeight={this.headerHeight}
                        rowHeight={this.rowHeight}
                        rowCount={this.getHiddenRowCount(row, miscIndex)}
                        rowGetter={({ index }) => this.table_content[miscIndex - this.getHiddenRowCount(row, miscIndex) + index]}
                        rowStyle={{alignItems: "stretch"}}
                        overscanRowCount={15}
                        headerClassName={"table-cell"}
                        _cellRenderer = {this._cellRenderer}
                        table_content = {this.table_content}
                    >
                    </HiddenRowTable>
                    <MenuDivider/>
                    <MenuItem text={"Show marked rows"} onClick={this._handleShowMarkedRows.bind(null, row, miscIndex)}/>
                    <MenuItem text={"Show all rows"} onClick={this._handleShowAllRows.bind(null, row, miscIndex)}/>
                </Menu>
            </Popover>
        );
    }

    _handleShowMarkedRowsTail(rowIndex, miscIndex){
        let table_render_content = this.state.table_render_content.slice();
        const keys = Object.keys(this.hiddenRowTableRef.current.checked).map(value => parseInt(value, 10)).sort((a, b) => b - a);
        keys.forEach(key => {
            const tmp = miscIndex + 1 + key;
            table_render_content.splice(rowIndex + 1, 0, this.table_content[tmp]);
        });
        this.setState({table_render_content});
    }

    _handleShowAllRowsTail(rowIndex, miscIndex){
        let table_render_content = this.state.table_render_content.slice();
        for(let i = this.table_content.length - 1; i > miscIndex; i--){
            table_render_content.splice(rowIndex + 1, 0, this.table_content[i]);
        }
        this.setState({table_render_content});
    }

    isRowHidingContentTail(rowIndex, miscIndex){
        const table_render_content = this.state.table_render_content;
        if (rowIndex === table_render_content.length - 1){
            return miscIndex !== this.table_content.length - 1;
        }
        // we only want to show tail hidden rows on the last row
        return false;
        // return this.state.table_render_content[rowIndex + 1]["misc"] - miscIndex - 1 !== 0;
    }

    getHiddenRowCountTail(rowIndex, miscIndex){
        const table_render_content = this.state.table_render_content;
        if (rowIndex === table_render_content.length - 1){
            return (this.table_content.length - 1) - miscIndex;
        }
        // we only want to show tail hidden rows on the last row
        return 0;
        // return this.state.table_render_content[rowIndex + 1]["misc"] - miscIndex - 1;
    }

    _showHiddenRowsMiscRendererTail(rowIndex, miscIndex){
        return (
            <Popover lazy={true} position={"left"}>
                <Tooltip content={"Show previously hidden rows"}>
                    <Icon icon={"chevron-down"}/>
                </Tooltip>
                <Menu>
                    <HiddenRowTable
                        ref = {this.hiddenRowTableRef}
                        width={750}
                        height={170}
                        headerHeight={this.headerHeight}
                        rowHeight={this.rowHeight}
                        rowCount={this.getHiddenRowCountTail(rowIndex, miscIndex)}
                        rowGetter={({ index }) => this.table_content[miscIndex + 1 + index]}
                        rowStyle={{alignItems: "stretch"}}
                        overscanRowCount={15}
                        headerClassName={"table-cell"}
                        _cellRenderer = {this._cellRenderer}
                        table_content = {this.table_content}
                    >
                    </HiddenRowTable>
                    <MenuDivider/>
                    <MenuItem text={"Show marked rows"} onClick={this._handleShowMarkedRowsTail.bind(null, rowIndex, miscIndex)}/>
                    <MenuItem text={"Show all rows"} onClick={this._handleShowAllRowsTail.bind(null, rowIndex, miscIndex)}/>
                </Menu>
            </Popover>
        );
    }

    // renderer for the "normal" cells
    _cellRenderer({
        cellData,
        columnData,
        columnIndex,
        dataKey,
        isScrolling,
        rowData,
        rowIndex,
    }){
        let color = this.getValueWithDependencies(this.state.color, rowData, dataKey, cellData);
        if (color === undefined){
            for (let i = 0; i < this.key_color_hierarchie.length; i++){
                let dataKey = this.key_color_hierarchie[i];
                color = this.getValueWithDependencies(this.state.color, rowData, dataKey, rowData[dataKey]);
                if (color !== undefined) break;
            }
        }
        return (
            <MyCell2 onColorMenuClick={this.handleColorMenuClick.bind(null, rowIndex, rowData, dataKey, columnIndex, cellData)}
                     onMenuClick={this.handleMenuClick.bind(null, rowIndex, rowData, dataKey, columnIndex, cellData)}
                     value={cellData}
                     color={color}
            />
        );
    }

    //renderer for the additional column "misc". contains some row interaction buttons and the "true" index of the row as cellData (often called "miscIndex")
    _miscCellRenderer({
        cellData,
        columnData,
        columnIndex,
        dataKey,
        isScrolling,
        rowData,
        rowIndex,
    }){
        return (
            <div className={"table-cell"}>
                <div className={"misc-overlay"}>
                    {this.isRowHidingContentTop(rowIndex, cellData) && this._showHiddenRowsMiscRenderer(rowIndex, cellData)}
                </div>
                <div className={"misc-overlay"} onClick={this._handleRemoveSpecificRow.bind(null, cellData)}>
                    <Tooltip content={"Hide this specific row"}>
                        <Icon icon={"exclude-row"}/>
                    </Tooltip>
                </div>
                <div className={"misc-overlay"}>
                    {this.isRowHidingContentTail(rowIndex, cellData) && this._showHiddenRowsMiscRendererTail(rowIndex, cellData)}
                </div>
                <div className={"misc-overlay"}>
                    {cellData}
                </div>
            </div>
        );
    }

    static _overscanIndicesGetter({
        direction,          // One of "horizontal" or "vertical"
        cellCount,          // Number of rows or columns in the current axis
        scrollDirection,    // 1 (forwards) or -1 (backwards)
        overscanCellsCount, // Maximum number of cells to over-render in either direction
        startIndex,         // Begin of range of visible cells
        stopIndex           // End of range of visible cells
    }) {
        return {
            overscanStartIndex: Math.max(0, startIndex - overscanCellsCount),
            overscanStopIndex: Math.min(cellCount - 1, stopIndex + overscanCellsCount)
        }
    }

    _renderColumns(list, columnWidth){
        let keys = Object.keys(list[0]);
        let tableColumns = keys.splice(0, keys.length - 1).map(column => (
            <Column
                key={column}
                label={column}
                dataKey={column}
                width={columnWidth}
                cellRenderer={this._cellRenderer}
                style={{margin: "0px"}}
            />
        ));
        tableColumns.push((
            <Column
                key={"misc"}
                label={""}
                dataKey={"misc"}
                width={120}
                cellRenderer={this._miscCellRenderer}
                style={{margin: "0px"}}/>
        ));
        return (
            tableColumns
        )
    }

    render() {
        return (
            <AutoSizer>
                {({ height, width }) => (
                    <Table
                        headerStyle={{margin: "0px"}}
                        id={"test"}
                        ref={this.tableRef}
                        width={width}
                        height={height}
                        headerHeight={this.headerHeight}
                        rowHeight={this.rowHeight}
                        rowCount={this.state.table_render_content.length}
                        rowGetter={({ index }) => this.state.table_render_content[index]}
                        rowStyle={{alignItems: "stretch", padding: "0 0 0 0px"}}
                        overscanRowCount={25}
                        scrollToAlignment={"start"}
                        overscanIndicesGetter={MaTable._overscanIndicesGetter}
                    >
                        {this._renderColumns(this.state.table_render_content, 250)}
                    </Table>
                )}
            </AutoSizer>
        );
    }
}

// Component enthält das Menü und die Tabelle und ermöglicht so die Synchronisation beider Elemente
class WindmillView extends Component {
    constructor(props){
        super(props);
        this.state = {
            scrollToIndex: undefined,
            scrollToDate: undefined,
            filterRange: undefined,
        };
        this.tableRef = React.createRef();
        this._handleScroll = this._handleScroll.bind(this);

        this.a = getTestData();
        this.foo = new Date(this.a[0]["Timestamp"]);
        this.foobar = new Date(this.a[this.a.length - 1]["Timestamp"]);
    }

    // nötig, damit sequenzielle Aufrufe von _handleScrollToRow mit demselben Index ein rerender auslösen
    _handleScroll() {
        let scrollToDate = this.state.scrollToDate;
        if (scrollToDate !== undefined){
            this.setState({scrollToDate: undefined});
        }
    }

    render() {
        const reactDayPickerProps = {classNames: dayPickerClassNames};
        return (
            <div className={"windmill-view-container"}>
                <Navbar>
                    <NavbarGroup>
                        <Popover position={"bottom"} lazy={true}>
                            <Button>
                                Filter
                            </Button>
                            <DateRangePicker
                                shortcuts={false}
                                minDate={this.foo}
                                maxDate={this.foobar}
                                onChange={selectedDates => {
                                    if (selectedDates[0] !== null) selectedDates[0].setHours(0);
                                    if (selectedDates[1] !== null) selectedDates[1].setHours(0);
                                    this.tableRef.current.filterDates(selectedDates[0], selectedDates[1]);
                                }}/>
                        </Popover>
                        <Popover position={"bottom"} lazy={true}>
                            <Button>
                                ScrollTo
                            </Button>
                            <DatePicker
                                dayPickerProps={reactDayPickerProps}
                                minDate={this.foo}
                                maxDate={this.foobar}
                                onChange={selectedDate => {
                                    if (selectedDate === null) return;
                                    selectedDate.setHours(0);
                                    this.tableRef.current.scrollToDate(selectedDate);
                                }}
                            />
                        </Popover>
                        <Popover>
                            <Button>
                                Hello World
                            </Button>
                        </Popover>
                    </NavbarGroup>
                </Navbar>
                <div className={"windmill-view-table-container"}>
                    <MaTable
                        ref={this.tableRef}
                        filterRange={this.state.filterRange}
                        tableContent={this.a}/>
                </div>
            </div>
        );
    }
}

class App extends Component {
    render() {
        return (
            <div className="App">
                <WindmillView/>
            </div>
        );
    }
}

export default App;
