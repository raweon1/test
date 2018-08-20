import React, {Component} from 'react';
import './App.css';
import {Table, Column} from "react-virtualized";

export class HiddenRowTable extends Component {
    constructor(props) {
        super(props);
        this.checked = {};

        this.handleChange = this.handleChange.bind(this);
        this._cellRenderer = this._cellRenderer.bind(this);
        this._showHiddenRowsTableColumnRenderer = this._showHiddenRowsTableColumnRenderer.bind(this);
    }

    handleChange(rowIndex, event){
        if (event.target.checked) this.checked[rowIndex] = true;
        else if (this.checked[rowIndex]) delete this.checked[rowIndex];
    }

    _cellRenderer({
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
                <input type={"checkbox"} defaultChecked={this.checked[rowIndex] ? this.checked[rowIndex] : false} onChange={this.handleChange.bind(this, rowIndex)}/>
            </div>
        );
    }

    _showHiddenRowsTableColumnRenderer(list){
        const columnWidths = [200, 190, 190, 70, 40];
        let keys = Object.keys(list[0]);
        // -2 : we dont want hexcode and misc
        let tableColumns = keys.splice(0, keys.length - 2).map((column, index) => (
            <Column
                key={column}
                label={column}
                dataKey={column}
                width={columnWidths[index]}
                cellRenderer={this.props._cellRenderer}
            />
        ));
        tableColumns.push(
            <Column
                key={"misc"}
                dataKey={"misc"}
                width={columnWidths[columnWidths.length - 1]}
                cellRenderer={this._cellRenderer}
            />
        );
        return (
            tableColumns
        );
    }

    render(){
        return (
            <Table
                id={"show-hidden-rows-table"}
                width={this.props.width}
                height={this.props.height}
                headerHeight={this.props.headerHeight}
                rowHeight={this.props.rowHeight}
                rowCount={this.props.rowCount}
                rowGetter={this.props.rowGetter}
                rowStyle={this.props.rowStyle}
                overscanRowCount={this.props.overscanRowCount}
                headerClassName={this.props.headerClassName}
            >
                {this._showHiddenRowsTableColumnRenderer(this.props.table_content)}
            </Table>
        );
    }
}
