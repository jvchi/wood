

export default function hero() {
  
  const array = [100, 101, 2, 4, 5, 6, 77, 200]
  let max = 0

  for (let i = 0; i < array.length; i++ ){
    if(array[i] > max){
      max = array[i]
      
    }
  }
  console.log(max)
  return (
    <main className='w-full h-screen flex justify-center items-center'>
      <h1 className='text-9xl'>wood</h1>
    </main>
  )
}
