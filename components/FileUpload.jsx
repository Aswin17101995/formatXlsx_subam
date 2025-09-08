'use client'
import { useRef, useState } from "react";
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import * as XLSX from 'xlsx';

const FileUpload = () => {
    const [loading,setLoading] = useState(false)
    const [excel_data,setExcelData] = useState([])
    const [sizeColumn,setSizeColum] = useState([])
    const inputRef = useRef();

    const handleAreaClick = () => {
        inputRef.current.click();
    };

    const handleFileUpload = (e)=>{
        console.log("file uploaded")
        console.log(e)
        const file = e.target.files[0]
        console.log(file)
        const reader = new FileReader()
        reader.onload = (e)=> {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            let jsonData = XLSX.utils.sheet_to_json(worksheet);
            jsonData = jsonData.slice(0,-1)
            console.log(jsonData)
            const orderIds = Object.keys(jsonData[0]).slice(0,-2)
            console.log(orderIds)
            const sizeColumn = jsonData.reduce((acc,ele)=> {
              if(ele['STORE']){
                return [...acc,ele["STORE"]]
              }else{
                return acc
              }
            },[])
            // console.log(sizeColumn)
            setSizeColum(sizeColumn)
            const column = ["Store",...sizeColumn]
            // console.log(column)
            let formatter_arr = []
            orderIds.forEach((itm)=>{
                let count_arr = []
                jsonData.forEach((val)=>{
                    if(itm == 3003){
                        console.log()
                    }
                    count_arr.push(val[`${itm}`].length == 0 ? 0 : val[`${itm}`])
                })
                let obj = {}
                obj[`${itm}`] = count_arr
                // console.log(obj,count_arr)
                formatter_arr.push(obj)
            })
            // console.log(formatter_arr)
            const hashMap = formatter_arr.reduce((acc,ele)=>{
              let key = Object.keys(ele)[0]
              let value = ele[`${key}`].join(',')
              if(acc[`${value}`]){
                acc[`${value}`].push(key)
                return {...acc};
              }else{
                return {...acc,[`${value}`]:[key]}
              }
            },{})
            // create for excel
            let excel = []
            let hashMapArr = Object.keys(hashMap)
            hashMapArr.forEach((itm)=>{
                // console.log(itm)
                let obj = {}
                obj[`store`] = hashMap[`${itm}`].join("-")
                let internal_size = itm.split(',')
                sizeColumn.forEach((val,i)=>{
                    obj[`${val}`] = internal_size[i]
                })
                const total_count = internal_size.reduce((acc,itm)=> acc + parseInt(itm),0)
                // console.log(total_count,itm)
                obj[`total`] = total_count
                obj[`total_carton`] = hashMap[`${itm}`].length
                obj[`total_pcs`] = hashMap[`${itm}`].length * total_count
                excel.push(obj)
            })
            setExcelData(excel)
            // console.log(excel)
        }
        reader.readAsArrayBuffer(file)
    }

    const handleClearData = ()=>{
        setExcelData([])
        setSizeColum([])
    }

    const generateXlsx = ()=>{
        const ws = XLSX.utils.json_to_sheet(excel_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFileXLSX(wb, `summary-${new Date().getTime()}.xlsx`);
    }

    return (
    <>
        {excel_data.length == 0 ? <>
                <div
            className="w-full max-w-xl border-2 border-green-600 bg-green-50 text-center rounded-lg m-auto flex flex-col items-center justify-center mt-20 p-10 cursor-pointer shadow-lg hover:bg-green-100 transition-all"
            onClick={handleAreaClick}
            style={{ minHeight: "180px" }}
        >
            <InsertDriveFileIcon style={{ fontSize: 64, color: '#218838', background: '#e6f4ea', borderRadius: 12, padding: 8 }} />
            <p className="mt-4 text-green-700 font-semibold text-lg">Click to upload your Excel file</p>
            <input
                type="file"
                ref={inputRef}
                onChange={(e)=>handleFileUpload(e)}
                className="hidden"
                accept=".xlsx,.xls,.csv"
            />
        </div>
        </> : <>
            <div>
                            <div className="w-full h-130 overflow-auto mt-8">
                <table className="min-w-full border border-blue-600 rounded-lg shadow-md bg-white">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-blue-100">
                            <th className="px-4 py-3 border border-blue-300 text-blue-800 font-semibold">Store</th>
                            {sizeColumn.map((itm) => (
                                <th key={itm} className="px-4 py-3 border border-blue-300 text-blue-800 font-semibold">{itm}</th>
                            ))}
                            <th className="px-4 py-3 border border-blue-300 text-blue-800 font-semibold">Total</th>
                            <th className="px-4 py-3 border border-blue-300 text-blue-800 font-semibold">Total Carton</th>
                            <th className="px-4 py-3 border border-blue-300 text-blue-800 font-semibold">Total Pcs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {excel_data.map((itm, index) => (
                            <tr key={itm.store} className={index % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                                <td className="px-4 py-2 border border-blue-200 text-center">{itm.store}</td>
                                {sizeColumn.map((val) => (
                                    <td key={val} className="px-4 py-2 border border-blue-200 text-center">{itm[`${val}`]}</td>
                                ))}
                                <td className="px-4 py-2 border border-blue-200 text-center font-bold">{itm.total}</td>
                                <td className="px-4 py-2 border border-blue-200 text-center">{itm.total_carton}</td>
                                <td className="px-4 py-2 border border-blue-200 text-center">{itm.total_pcs}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-10 w-full flex items-center justify-center">
             <div className="p-2 bg-blue-200 rounded-md cursor-pointer" onClick={handleClearData}>Clear</div>
              <div className="ml-2 p-2 bg-blue-200 rounded-md cursor-pointer" onClick={generateXlsx}>Generate Xlsx</div>
            </div>
            </div>
        </>
        }

    </>
    );
};

export default FileUpload;